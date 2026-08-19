import type { TaskStatus } from "@workspace/ui/components/task"
import type {
  ChainOfThoughtStepItem,
  TaskItemData,
  ToolCallItem,
} from "./components/elements"
import { extractOpenUI } from "./openui/parser"

export interface NormalizedAssistantTurn {
  id?: string
  role: "assistant" | "user" | "system"
  text: string
  thinking: string
  tools: ToolCallItem[]
  chainOfThought?: ChainOfThoughtStepItem[]
  tasks?: Array<{
    title: string
    status?: TaskStatus
    items?: TaskItemData[]
  }>
  openui?: { source: string; complete: boolean }
}

const TOOL_NAMES: Readonly<Record<string, string>> = Object.freeze({
  list_deals: "Reviewing deals",
  get_deal: "Opening deal details",
  list_customers: "Reviewing customers",
  get_customer: "Opening customer details",
  create_proposal: "Preparing a proposal",
  send_email: "Preparing an email",
  gmail_send_email: "Dispatching Gmail email",
  gmail_create_draft: "Creating Gmail draft",
  gcal_list_events: "Checking Google Calendar",
  gcal_create_event: "Scheduling Google Calendar event",
  gcal_cancel_event: "Canceling Google Calendar event",
  schedule_event: "Checking the calendar",
  ask_clarifying_questions: "Requesting clarification",
  askClarifyingQuestions: "Requesting clarification",
})

// Hoisted regular expressions to avoid per-render / per-function-call regex recompilation (js-hoist-regexp)
const THINK_CLOSED_CAPTURE_REGEX = /<think>([\s\S]*?)<\/think>/g
const THINK_CLOSED_GLOBAL_REGEX = /<think>[\s\S]*?<\/think>/g
const THINK_OPEN_REGEX = /<think>([\s\S]*)$/
const THINK_OPEN_GLOBAL_REGEX = /<think>[\s\S]*$/

const JSON_TITLE_REGEX = /"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
const JSON_SUBTITLE_REGEX = /"subtitle"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/

const LEAKED_FN_REGEX_1 =
  /Here is a JSON for a function call with its proper arguments[^\n]*:\s*```(?:json)?\s*\{[\s\S]*?\}\s*```\s*(?:This function call will[^\n.]*\.?)?/gi
const LEAKED_FN_REGEX_2 =
  /```(?:json)?\s*\{\s*"name"\s*:\s*"[a-zA-Z0-9_-]+"\s*,\s*"(?:parameters|arguments|args)"\s*:[\s\S]*?\}\s*```/gi

// Tool name formatting regexes hoisted to module scope (js-hoist-regexp)
const TOOL_REPLACE_REGEX = /[_-]/g
const UPPERCASE_FIRST_REGEX = /^./

// Memoization cache for normalized messages to avoid O(N * M) parsing during streaming (js-cache-function-results)
interface CachedTurnEntry {
  signature: string
  result: NormalizedAssistantTurn
}

const normalizationCache = new WeakMap<object, CachedTurnEntry>()

/**
 * Computes a lightweight fingerprint signature of message content, parts, and tool states
 * to guarantee that streaming tokens and in-place state transitions always trigger fresh normalization.
 */
function computeMessageSignature(msgObj: Record<string, unknown>): string {
  const content = String(msgObj.content ?? msgObj.text ?? "")
  const parts = Array.isArray(msgObj.parts) ? msgObj.parts : []
  if (parts.length === 0 && !msgObj.toolCalls) {
    return `c:${content}`
  }

  let partsSig = ""
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (!p || typeof p !== "object") continue
    const rec = p as Record<string, unknown>
    const textSnippet = String(
      rec.text ??
        rec.content ??
        rec.value ??
        rec.arguments ??
        rec.input ??
        rec.args ??
        ""
    )
    const resultSnippet = rec.result !== undefined ? String(rec.result) : ""
    partsSig += `|${rec.type}:${textSnippet}:${rec.status ?? rec.state ?? ""}:${rec.approvalId ?? ""}:${resultSnippet}`
  }

  if (Array.isArray(msgObj.toolCalls)) {
    for (const tc of msgObj.toolCalls as unknown[]) {
      if (!tc || typeof tc !== "object") continue
      const r = tc as Record<string, unknown>
      partsSig += `|tc:${r.id}:${r.status}:${r.errorText ?? ""}`
    }
  }

  return `c:${content}${partsSig}`
}

/**
 * Defensively unpacks nested JSON properties up to a maximum depth to prevent stack overflows
 * or hangs from circular references or excessively deep payloads.
 */
function deepUnpackJsonProperties(
  obj: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (depth > 6) return obj
  if (typeof obj === "string") {
    const trimmed = obj.trim()
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        return deepUnpackJsonProperties(parsed, depth + 1, seen)
      } catch {
        return obj
      }
    }
    return obj
  }
  if (Array.isArray(obj)) {
    if (seen.has(obj)) return obj
    seen.add(obj)
    if (obj.length === 0) return obj
    return obj.map((item) => deepUnpackJsonProperties(item, depth + 1, seen))
  }
  if (obj && typeof obj === "object") {
    if (seen.has(obj)) return obj
    seen.add(obj)
    const res: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      res[k] = deepUnpackJsonProperties(v, depth + 1, seen)
    }
    return res
  }
  return obj
}

export function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const unpacked = deepUnpackJsonProperties(value)
    if (unpacked && typeof unpacked === "object" && !Array.isArray(unpacked)) {
      return unpacked as Record<string, unknown>
    }
    return {}
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed)
      return objectValue(parsed)
    } catch {
      // Attempt partial / tolerant JSON recovery for streaming args
      try {
        const titleMatch = trimmed.match(JSON_TITLE_REGEX)
        const subtitleMatch = trimmed.match(JSON_SUBTITLE_REGEX)
        const recovered: Record<string, unknown> = {}
        if (titleMatch?.[1]) recovered.title = titleMatch[1]
        if (subtitleMatch?.[1]) recovered.subtitle = subtitleMatch[1]

        const questionsIdx = trimmed.indexOf('"questions"')
        if (questionsIdx >= 0) {
          const arrayStart = trimmed.indexOf("[", questionsIdx)
          if (arrayStart >= 0) {
            const lastObjEnd = trimmed.lastIndexOf("}")
            if (lastObjEnd > arrayStart) {
              const arraySlice = `${trimmed.slice(arrayStart, lastObjEnd + 1)}]`
              try {
                const parsedArr = JSON.parse(arraySlice)
                if (Array.isArray(parsedArr)) {
                  recovered.questions = parsedArr
                }
              } catch {
                // partial array parse failed
              }
            }
          }
        }
        if (Object.keys(recovered).length > 0) return recovered
      } catch {
        // ignore recovery errors
      }
      return {}
    }
  }
  return {}
}

export function normalizeAssistantMessage(
  message: unknown
): NormalizedAssistantTurn {
  if (!message || typeof message !== "object") {
    return {
      role: "assistant",
      text: typeof message === "string" ? message : "",
      thinking: "",
      tools: [],
    }
  }

  const msgObj = message as Record<string, unknown>

  // Quick cache lookup using full message signature (avoids stale cache during streaming)
  const currentSignature = computeMessageSignature(msgObj)
  const cached = normalizationCache.get(msgObj)
  if (cached && cached.signature === currentSignature) {
    return cached.result
  }

  let parts = Array.isArray(msgObj.parts) ? msgObj.parts : []
  if (
    parts.length === 1 &&
    parts[0] &&
    typeof parts[0] === "object" &&
    (parts[0] as Record<string, unknown>).role &&
    Array.isArray((parts[0] as Record<string, unknown>).parts)
  ) {
    parts = (parts[0] as Record<string, unknown>).parts as unknown[]
  }

  let text = parts
    .filter((p: unknown) => (p as Record<string, unknown>)?.type === "text")
    .map((p: unknown) => {
      const rec = p as Record<string, unknown>
      return String(rec.text ?? rec.content ?? rec.value ?? "")
    })
    .join("")

  if (!text) {
    if (typeof msgObj.content === "string") {
      text = msgObj.content
    } else if (typeof msgObj.text === "string") {
      text = msgObj.text
    } else if (Array.isArray(msgObj.content)) {
      text = (msgObj.content as unknown[])
        .map((c: unknown) => {
          if (typeof c === "string") return c
          const r = c as Record<string, unknown> | null
          return String(r?.text ?? r?.content ?? "")
        })
        .join("")
    }
  }

  let thinking = parts
    .filter((p: unknown) => {
      const t = (p as Record<string, unknown>)?.type
      return t === "thinking" || t === "reasoning"
    })
    .map((p: unknown) => {
      const rec = p as Record<string, unknown>
      return String(
        rec.content ?? rec.thinking ?? rec.reasoning ?? rec.text ?? ""
      )
    })
    .join("")

  // Extract all <think>...</think> tags if present in text (common in DeepSeek / reasoning models)
  if (text.includes("<think>")) {
    const closedMatches = [...text.matchAll(THINK_CLOSED_CAPTURE_REGEX)]
    if (closedMatches.length > 0) {
      const extractedBlocks = closedMatches
        .map((m) => m[1]?.trim())
        .filter(Boolean)
        .join("\n\n")
      thinking = thinking
        ? `${thinking}\n\n${extractedBlocks}`
        : extractedBlocks
      text = text.replace(THINK_CLOSED_GLOBAL_REGEX, "").trim()
    } else {
      const openThinkMatch = text.match(THINK_OPEN_REGEX)
      if (openThinkMatch?.[1]) {
        const extractedThink = openThinkMatch[1].trim()
        thinking = thinking
          ? `${thinking}\n\n${extractedThink}`
          : extractedThink
        text = text.replace(THINK_OPEN_GLOBAL_REGEX, "").trim()
      }
    }
  }

  const calls = new Map<string, ToolCallItem>()

  // Direct toolCalls on message object
  if (Array.isArray(msgObj.toolCalls)) {
    for (const tc of msgObj.toolCalls as unknown[]) {
      if (tc && typeof tc === "object") {
        const r = tc as Record<string, unknown>
        const id = String(r.id ?? `tool-${calls.size}`)
        const approvalObj = r.approval as Record<string, unknown> | undefined
        calls.set(id, {
          id,
          name: String(r.name ?? "unknown_tool"),
          args: objectValue(r.args ?? r.arguments ?? r.parameters ?? r.input),
          status: String(r.status ?? "completed"),
          result: r.result ?? r.output,
          needsApproval: Boolean(r.needsApproval || approvalObj?.needsApproval),
          approvalId:
            typeof r.approvalId === "string"
              ? r.approvalId
              : typeof approvalObj?.id === "string"
                ? approvalObj.id
                : undefined,
          errorText:
            typeof r.errorText === "string"
              ? r.errorText
              : r.status === "error"
                ? String(r.result ?? "Tool execution failed")
                : undefined,
        })
      }
    }
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") continue
    const p = part as Record<string, unknown>
    const pType = p.type

    if (
      pType === "tool-call" ||
      pType === "tool-invocation" ||
      pType === "tool"
    ) {
      const id = String(
        p.id ??
          p.toolCallId ??
          `${p.name ?? p.toolName ?? "tool"}-${calls.size}`
      )
      const existing = calls.get(id)
      const name = String(
        p.name ?? p.toolName ?? p.tool ?? existing?.name ?? "unknown_tool"
      )
      const rawArgs = p.arguments ?? p.input ?? p.args ?? p.parameters ?? p.data
      const args = objectValue(rawArgs)
      const approvalObj = p.approval as Record<string, unknown> | undefined

      calls.set(id, {
        id,
        name,
        args: Object.keys(args).length > 0 ? args : existing?.args || {},
        status:
          approvalObj?.approved === true
            ? "approved"
            : approvalObj?.approved === false
              ? "rejected"
              : approvalObj
                ? "awaiting-approval"
                : p.state === "output-error"
                  ? "error"
                  : p.output !== undefined || p.result !== undefined
                    ? "completed"
                    : (existing?.status ?? "running"),
        result: p.output ?? p.result ?? existing?.result,
        needsApproval: Boolean(
          p.needsApproval ??
            approvalObj?.needsApproval ??
            existing?.needsApproval
        ),
        approvalId:
          typeof p.approvalId === "string"
            ? p.approvalId
            : typeof approvalObj?.id === "string"
              ? approvalObj.id
              : existing?.approvalId,
        errorText:
          typeof p.errorText === "string"
            ? p.errorText
            : p.state === "output-error"
              ? String(p.output ?? "Tool execution failed")
              : undefined,
      })
    }

    if (pType === "tool-result") {
      const id = String(p.toolCallId ?? p.id ?? "")
      let current = calls.get(id)
      if (!current && calls.size === 1) {
        const firstKey = calls.keys().next().value
        if (firstKey) current = calls.get(firstKey)
      }
      if (!current) {
        current = {
          id: id || `tool-res-${calls.size}`,
          name: String(p.toolName ?? p.name ?? "unknown_tool"),
          args: {},
        }
      }
      const targetId = current.id || id
      const isError = Boolean(
        p.error || p.isError || p.state === "output-error"
      )
      calls.set(targetId, {
        ...current,
        name:
          current.name !== "unknown_tool"
            ? current.name
            : String(p.toolName ?? p.name ?? current.name),
        result: p.content ?? p.output ?? p.result,
        status: isError ? "error" : "completed",
        errorText: isError
          ? String(
              p.errorText ??
                p.error ??
                p.content ??
                p.output ??
                p.result ??
                "Tool execution failed"
            )
          : undefined,
      })
    }
  }

  const chainOfThought: ChainOfThoughtStepItem[] | undefined = Array.isArray(
    msgObj.chainOfThought
  )
    ? (msgObj.chainOfThought as ChainOfThoughtStepItem[])
    : undefined

  let tasks:
    | Array<{ title: string; status?: TaskStatus; items?: TaskItemData[] }>
    | undefined = Array.isArray(msgObj.tasks)
    ? (msgObj.tasks as Array<{
        title: string
        status?: TaskStatus
        items?: TaskItemData[]
      }>)
    : undefined

  if (!tasks && calls.size > 0) {
    const toolList = [...calls.values()]
    const propTool = toolList.find(
      (c) => c.name === "create_proposal" || c.name === "update_proposal"
    )
    const invTool = toolList.find(
      (c) => c.name === "create_invoice" || c.name === "update_invoice"
    )
    const schedTool = toolList.find((c) => c.name === "schedule_document_send")

    if (propTool) {
      const isCompleted = propTool.status === "completed"
      tasks = [
        {
          title: "Proposal Synthesis & Composition",
          status: isCompleted ? "completed" : "in_progress",
        },
      ]
    } else if (invTool) {
      const isCompleted = invTool.status === "completed"
      tasks = [
        {
          title: "Invoice Generation & Billing Calculation",
          status: isCompleted ? "completed" : "in_progress",
        },
      ]
    } else if (schedTool) {
      const isCompleted = schedTool.status === "completed"
      tasks = [
        {
          title: "Document Dispatch Scheduling",
          status: isCompleted ? "completed" : "in_progress",
        },
      ]
    }
  }

  const hasQuestionnaire = [...calls.values()].some((call) =>
    call.name.toLowerCase().includes("clarifying_question")
  )
  const ui = extractOpenUI(hasQuestionnaire ? "" : text)
  const rawProse = hasQuestionnaire ? "" : ui.prose
  const sanitizedProse = stripLeakedFunctionCalls(rawProse)

  const normalized: NormalizedAssistantTurn = {
    id: typeof msgObj.id === "string" ? msgObj.id : undefined,
    role: (msgObj.role as "assistant" | "user" | "system") || "assistant",
    text: sanitizedProse,
    thinking,
    tools: [...calls.values()],
    chainOfThought,
    tasks,
    openui: ui.hasOpenUI
      ? { source: ui.program, complete: ui.isComplete }
      : undefined,
  }

  // Cache normalized result against message object identity and signature
  normalizationCache.set(msgObj, {
    signature: currentSignature,
    result: normalized,
  })

  return normalized
}

export function latestAssistantThinking(messages: unknown[]): string {
  if (!Array.isArray(messages) || messages.length === 0) return ""
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || typeof message !== "object") continue
    if ((message as Record<string, unknown>).role !== "assistant") continue
    return normalizeAssistantMessage(message).thinking
  }
  return ""
}

export function stripLeakedFunctionCalls(rawText: string): string {
  if (!rawText) return ""
  return rawText
    .replace(LEAKED_FN_REGEX_1, "")
    .replace(LEAKED_FN_REGEX_2, "")
    .trim()
}

export function toolLabel(name: string): string {
  return (
    TOOL_NAMES[name] ??
    name
      .replace(TOOL_REPLACE_REGEX, " ")
      .replace(UPPERCASE_FIRST_REGEX, (c) => c.toUpperCase())
  )
}
