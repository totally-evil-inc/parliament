import type { ToolCallItem } from "./components/elements"
import { extractOpenUI } from "./openui/parser"

export interface NormalizedAssistantTurn {
  id?: string
  role: "assistant" | "user" | "system"
  text: string
  thinking: string
  tools: ToolCallItem[]
  openui?: { source: string; complete: boolean }
}

const toolNames: Record<string, string> = {
  list_deals: "Reviewing deals",
  get_deal: "Opening deal details",
  list_customers: "Reviewing customers",
  get_customer: "Opening customer details",
  create_proposal: "Preparing a proposal",
  send_email: "Preparing an email",
  schedule_event: "Checking the calendar",
  ask_clarifying_questions: "Requesting clarification",
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      return objectValue(JSON.parse(trimmed))
    } catch {
      // Attempt partial / tolerant JSON recovery for streaming args
      try {
        const titleMatch = trimmed.match(
          /"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
        )
        const subtitleMatch = trimmed.match(
          /"subtitle"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
        )
        const recovered: Record<string, unknown> = {}
        if (titleMatch?.[1]) recovered.title = titleMatch[1]
        if (subtitleMatch?.[1]) recovered.subtitle = subtitleMatch[1]

        // If questions array is partially available
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
  message: any
): NormalizedAssistantTurn {
  let parts = Array.isArray(message?.parts) ? message.parts : []
  if (parts.length === 1 && parts[0]?.role && Array.isArray(parts[0]?.parts)) {
    parts = parts[0].parts
  }

  let text = parts
    .filter((p: any) => p?.type === "text")
    .map((p: any) => p.text ?? p.content ?? p.value ?? "")
    .join("")

  if (!text) {
    if (typeof message?.content === "string") {
      text = message.content
    } else if (typeof message?.text === "string") {
      text = message.text
    } else if (Array.isArray(message?.content)) {
      text = message.content
        .map((c: any) =>
          typeof c === "string" ? c : (c?.text ?? c?.content ?? "")
        )
        .join("")
    }
  }

  const thinking = parts
    .filter((p: any) => p?.type === "thinking")
    .map((p: any) => p.content ?? p.thinking ?? "")
    .join("")
  const calls = new Map<string, ToolCallItem>()

  // Direct toolCalls on message object
  if (Array.isArray(message?.toolCalls)) {
    for (const tc of message.toolCalls) {
      if (tc && typeof tc === "object") {
        const id = String(tc.id ?? `tool-${calls.size}`)
        calls.set(id, {
          id,
          name: String(tc.name ?? "unknown_tool"),
          args: objectValue(
            tc.args ?? tc.arguments ?? tc.parameters ?? tc.input
          ),
          status: tc.status ?? "completed",
          result: tc.result ?? tc.output,
          needsApproval: Boolean(
            tc.needsApproval || tc.approval?.needsApproval
          ),
          approvalId: tc.approval?.id,
        })
      }
    }
  }

  for (const part of parts) {
    if (
      part?.type === "tool-call" ||
      part?.type === "tool-invocation" ||
      part?.type === "tool"
    ) {
      const id = String(
        part.id ??
          part.toolCallId ??
          `${part.name ?? part.toolName ?? "tool"}-${calls.size}`
      )
      const existing = calls.get(id)
      const name = String(
        part.name ??
          part.toolName ??
          part.tool ??
          existing?.name ??
          "unknown_tool"
      )
      const rawArgs =
        part.arguments ??
        part.input ??
        part.args ??
        part.parameters ??
        part.data
      const args = objectValue(rawArgs)

      calls.set(id, {
        id,
        name,
        args: Object.keys(args).length > 0 ? args : existing?.args || {},
        status:
          part.approval?.approved === true
            ? "approved"
            : part.approval?.approved === false
              ? "rejected"
              : part.approval
                ? "awaiting-approval"
                : part.state === "output-error"
                  ? "error"
                  : part.output !== undefined || part.result !== undefined
                    ? "completed"
                    : (existing?.status ?? "running"),
        result: part.output ?? part.result ?? existing?.result,
        needsApproval: Boolean(
          part.approval?.needsApproval ?? existing?.needsApproval
        ),
        approvalId: part.approval?.id ?? existing?.approvalId,
      })
    }
    if (part?.type === "tool-result") {
      const id = String(part.toolCallId ?? part.id ?? "")
      let current = calls.get(id)
      if (!current && calls.size === 1) {
        const firstKey = calls.keys().next().value
        if (firstKey) current = calls.get(firstKey)
      }
      if (!current) {
        current = {
          id: id || `tool-res-${calls.size}`,
          name: String(part.toolName ?? part.name ?? "unknown_tool"),
          args: {},
        }
      }
      const targetId = current.id || id
      calls.set(targetId, {
        ...current,
        name:
          current.name !== "unknown_tool"
            ? current.name
            : String(part.toolName ?? part.name ?? current.name),
        result: part.content ?? part.output ?? part.result,
        status:
          part.error || part.state === "output-error" ? "error" : "completed",
      })
    }
  }
  const hasQuestionnaire = [...calls.values()].some((call) =>
    call.name.toLowerCase().includes("clarifying_question")
  )
  const ui = extractOpenUI(hasQuestionnaire ? "" : text)
  return {
    id: message?.id,
    role: message?.role ?? "assistant",
    // The questionnaire widget is the canonical rendering. Suppress the
    // model's repeated plaintext list so users do not see the same questions
    // twice (and so the form remains the only interactive surface).
    text: hasQuestionnaire ? "" : ui.prose,
    thinking,
    tools: [...calls.values()],
    openui: ui.hasOpenUI
      ? { source: ui.program, complete: ui.isComplete }
      : undefined,
  }
}

export function toolLabel(name: string): string {
  return (
    toolNames[name] ??
    name.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase())
  )
}
