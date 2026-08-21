import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type AgentEvent, agentEventSchema } from "@workspace/agent"
import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAIModels } from "../hooks/use-ai-models"
import { conversationDetailQueryOptions } from "../hooks/use-agent-conversations"
import { extractToolErrorText } from "../normalization"
import { invalidateAgentQueries as invalidateQueriesHelper } from "../query-invalidation"

const AUTH_SERVER_URL =
  import.meta.env.VITE_AUTH_SERVER_URL ||
  import.meta.env.VITE_BETTER_AUTH_URL ||
  "http://localhost:4000"

export interface AgentChatError {
  code: string
  message: string
}

export interface ToolCallItem {
  id: string
  name: string
  args?: Record<string, unknown>
  result?: unknown
  status?: string
  needsApproval?: boolean
  approvalId?: string
  errorText?: string
  retryOf?: string
  attempt?: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  thinking?: string
  openuiCode?: string
  toolCalls?: ToolCallItem[]
  error?: AgentChatError
  isTerminal?: boolean
}

export interface CommandChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isHydrating: boolean
  threadId?: string
  activeTitle?: string
  selectedModel: string
  chatError: AgentChatError | null
}

export interface CommandChatActions {
  setSelectedModel: (model: string) => void
  sendPrompt: (text: string) => Promise<void>
  stop: () => void
  retryLastPrompt: () => Promise<void>
  approveTool: (approvalId: string) => Promise<void>
  rejectTool: (approvalId: string) => Promise<void>
  clearError: () => void
  loadThread: (id: string) => Promise<void>
  resetNewChat: () => void
  isCurrentThread: (id: string) => boolean
}

export type CommandChatContextValue = CommandChatState & CommandChatActions

const CommandChatStateContext = createContext<CommandChatState | null>(null)
const CommandChatActionsContext = createContext<CommandChatActions | null>(null)

/**
 * Parses an incoming SSE stream buffer chunk into validated AgentEvents and remaining incomplete buffer.
 */
export function parseSseChunk(chunk: string): {
  events: AgentEvent[]
  remainder: string
} {
  const normalized = chunk.replace(/\r\n/g, "\n")
  const blocks = normalized.split("\n\n")
  const remainder = blocks.pop() ?? ""
  const events: AgentEvent[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.startsWith(":")) continue // Skip heartbeats/comments

    const lines = block.split("\n")
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const rawJson = line.slice(6).trim()
        try {
          const eventParsed = JSON.parse(rawJson)
          const eventValidation = agentEventSchema.safeParse(eventParsed)
          if (eventValidation.success) {
            events.push(eventValidation.data)
          }
        } catch {
          // Ignore partial or non-JSON data lines
        }
      }
    }
  }

  return { events, remainder }
}

/**
 * Flushes any remaining data lines in the trailing SSE buffer at EOF.
 */
export function parseSseTrailingBuffer(buffer: string): AgentEvent[] {
  if (!buffer.trim()) return []
  const normalized = buffer.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  const events: AgentEvent[] = []

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const rawJson = line.slice(6).trim()
      try {
        const eventParsed = JSON.parse(rawJson)
        const eventValidation = agentEventSchema.safeParse(eventParsed)
        if (eventValidation.success) {
          events.push(eventValidation.data)
        }
      } catch {
        // Ignore
      }
    }
  }
  return events
}

/**
 * Terminal reconciliation pass for assistant turn completion, suspension, or error.
 * Ensures no tool calls remain indefinitely running or pending while preserving actionable approvals.
 */
export function reconcileTerminalTurn(
  messages: ChatMessage[],
  assistantMsgId: string,
  terminalState: "completed" | "suspended" | "error",
  errorPayload?: AgentChatError
): ChatMessage[] {
  return messages.map((msg) => {
    if (msg.id !== assistantMsgId) return msg

    const toolCalls = msg.toolCalls
      ? msg.toolCalls.map((tc) => {
          // Action approval requests remain actionable in pending_approval
          if (
            tc.needsApproval ||
            tc.status === "pending_approval" ||
            tc.status === "approved" ||
            tc.status === "rejected" ||
            tc.status === "expired"
          ) {
            return tc
          }

          // If the tool has a concrete result, derive terminal state from result
          if (tc.result !== undefined) {
            const resObj = tc.result as Record<string, unknown> | null
            const hasObjError =
              resObj && typeof resObj === "object" && Boolean(resObj.error)
            const isError = Boolean(
              tc.errorText || hasObjError || tc.status === "error"
            )
            const isRejected =
              resObj?.status === "rejected" || resObj?.status === "denied"
            const isSkipped = resObj?.status === "skipped"
            return {
              ...tc,
              status: isError
                ? "error"
                : isRejected
                  ? "rejected"
                  : isSkipped
                    ? "skipped"
                    : "completed",
            }
          }

          // Unresolved running/pending calls transition based on terminal outcome
          if (
            tc.status === "running" ||
            tc.status === "pending" ||
            tc.status === undefined
          ) {
            if (terminalState === "completed") {
              return { ...tc, status: "completed" }
            }
            if (terminalState === "suspended") {
              return { ...tc, status: "suspended" as const }
            }
            return {
              ...tc,
              status: "error" as const,
              errorText:
                tc.errorText ||
                errorPayload?.message ||
                "Tool execution did not finish",
            }
          }

          return tc
        })
      : msg.toolCalls

    const nextError = errorPayload ? errorPayload : msg.error
    const shouldMarkTerminal =
      terminalState === "completed" || terminalState === "error"

    return {
      ...msg,
      toolCalls,
      ...(nextError ? { error: nextError } : {}),
      isTerminal: shouldMarkTerminal,
    }
  })
}

const VALID_TOOL_STATUSES = new Set([
  "pending",
  "running",
  "pending_approval",
  "completed",
  "error",
  "suspended",
  "rejected",
  "skipped",
  "approved",
  "expired",
])

/**
 * Normalizes raw conversation messages loaded from server persistence.
 * Handles production wire shapes (tool-call, tool-result, approval-requested, tool)
 * and concatenates all text/thinking parts.
 */
export function normalizePersistedMessages(
  rawMessages: unknown[]
): ChatMessage[] {
  if (!Array.isArray(rawMessages)) return []

  return rawMessages.map((raw) => {
    if (!raw || typeof raw !== "object") {
      return {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: "",
      }
    }
    const m = raw as Record<string, unknown>
    const id = String(m.id || crypto.randomUUID())
    const role = (
      m.role === "assistant" || m.role === "system" ? m.role : "user"
    ) as "user" | "assistant" | "system"

    let text = typeof m.content === "string" ? m.content : ""
    let thinking = ""
    const tools: ToolCallItem[] = []

    if (Array.isArray(m.parts)) {
      if (role === "assistant") {
        text = "" // Rebuild from structured parts
      }
      for (const p of m.parts) {
        if (!p || typeof p !== "object") continue
        const part = p as Record<string, unknown>

        if (part.type === "text") {
          const partText =
            typeof part.text === "string"
              ? part.text
              : typeof part.content === "string"
                ? part.content
                : ""
          text += partText
        } else if (part.type === "thinking") {
          const partThinking =
            typeof part.text === "string"
              ? part.text
              : typeof part.thinking === "string"
                ? part.thinking
                : typeof part.content === "string"
                  ? part.content
                  : ""
          thinking += partThinking
        } else if (
          part.type === "tool-call" ||
          part.type === "tool-invocation"
        ) {
          const callId = String(
            part.toolCallId ?? part.callId ?? part.id ?? crypto.randomUUID()
          )
          const name = String(part.toolName ?? part.name ?? "tool")
          const args = (part.args ?? part.input ?? {}) as Record<
            string,
            unknown
          >
          const retryOf = part.retryOf ? String(part.retryOf) : undefined
          const attempt =
            typeof part.attempt === "number" ? part.attempt : undefined
          const approvalId = part.approvalId
            ? String(part.approvalId)
            : undefined
          const needsApproval = Boolean(part.needsApproval)

          const existing = tools.find((t) => t.id === callId)
          if (existing) {
            existing.name = existing.name || name
            existing.args =
              Object.keys(existing.args || {}).length > 0 ? existing.args : args
            if (retryOf && !existing.retryOf) existing.retryOf = retryOf
            if (attempt && !existing.attempt) existing.attempt = attempt
            if (approvalId && !existing.approvalId)
              existing.approvalId = approvalId
            if (needsApproval) existing.needsApproval = true
          } else {
            tools.push({
              id: callId,
              name,
              args,
              status: "pending",
              retryOf,
              attempt,
              approvalId,
              needsApproval,
            })
          }
        } else if (part.type === "tool-result") {
          const callId = String(
            part.toolCallId ?? part.callId ?? part.id ?? crypto.randomUUID()
          )
          const name = String(part.toolName ?? part.name ?? "")
          const result = part.result ?? part.output
          const isError = Boolean(
            part.isError ||
              (part.output &&
                typeof part.output === "object" &&
                (part.output as Record<string, unknown>).type === "error-text")
          )
          const retryOf = part.retryOf ? String(part.retryOf) : undefined
          const attempt =
            typeof part.attempt === "number" ? part.attempt : undefined

          const existing = tools.find((t) => t.id === callId)
          if (existing) {
            existing.result = result
            if (name && !existing.name) existing.name = name
            existing.status = isError ? "error" : "completed"
            if (retryOf && !existing.retryOf) existing.retryOf = retryOf
            if (attempt && !existing.attempt) existing.attempt = attempt
          } else {
            tools.push({
              id: callId,
              name: name || "tool",
              result,
              status: isError ? "error" : "completed",
              retryOf,
              attempt,
            })
          }
        } else if (part.type === "tool") {
          const rawStatus =
            typeof part.status === "string" ? part.status : undefined
          let status: string = "completed"
          if (rawStatus && VALID_TOOL_STATUSES.has(rawStatus)) {
            status = rawStatus
          } else if (rawStatus) {
            // Unknown or obsolete status: map conservatively
            status =
              part.result !== undefined && part.result !== null
                ? "completed"
                : "error"
          }

          tools.push({
            id: String(part.callId || part.id || crypto.randomUUID()),
            name: String(part.toolName || part.name || "tool"),
            args: (part.args as Record<string, unknown>) || {},
            result: part.result,
            status,
            approvalId: part.approvalId ? String(part.approvalId) : undefined,
            needsApproval: Boolean(part.needsApproval),
            retryOf: part.retryOf ? String(part.retryOf) : undefined,
            attempt:
              typeof part.attempt === "number" ? part.attempt : undefined,
            errorText: part.errorText
              ? String(part.errorText)
              : status === "error" && !rawStatus
                ? "Unknown tool state normalized to error."
                : undefined,
          })
        } else if (part.type === "approval-requested") {
          const resolvedApprovalId = String(
            part.approvalId ?? part.resumeId ?? part.id ?? "approval"
          )
          const existing = tools.find(
            (tc) =>
              (part.callId !== undefined && tc.id === String(part.callId)) ||
              (tc.name === String(part.toolName ?? "action") &&
                tc.status === "pending")
          )
          if (existing) {
            existing.status = "pending_approval"
            existing.needsApproval = true
            existing.approvalId = resolvedApprovalId
            if (part.toolArgs ?? part.args) {
              existing.args = (part.toolArgs ?? part.args) as Record<
                string,
                unknown
              >
            }
          } else {
            tools.push({
              id: part.callId ? String(part.callId) : resolvedApprovalId,
              name: String(part.toolName ?? "action"),
              args: (part.toolArgs ?? part.args ?? {}) as Record<
                string,
                unknown
              >,
              status: "pending_approval",
              needsApproval: true,
              approvalId: resolvedApprovalId,
            })
          }
        }
      }
    }

    // Normalize persisted tool calls and collapse superseded retries
    let normalizedTools = tools.map((tc) => {
      if (
        tc.needsApproval ||
        tc.status === "pending_approval" ||
        tc.status === "approved" ||
        tc.status === "rejected" ||
        tc.status === "expired"
      ) {
        return tc
      }
      if (tc.result !== undefined && tc.result !== null) {
        const resObj = tc.result as Record<string, unknown> | null
        const hasObjError =
          resObj && typeof resObj === "object" && Boolean(resObj.error)
        const isError = Boolean(
          tc.errorText || hasObjError || tc.status === "error"
        )
        const isRejected =
          resObj?.status === "rejected" || resObj?.status === "denied"
        const isSkipped = resObj?.status === "skipped"
        return {
          ...tc,
          status: isError
            ? ("error" as const)
            : isRejected
              ? ("rejected" as const)
              : isSkipped
                ? ("skipped" as const)
                : ("completed" as const),
        }
      }
      if (tc.status === "pending" || tc.status === "running") {
        const isInterrupted = m.status === "interrupted"
        const isErrorStatus = m.status === "error"
        const isCompleted = m.status === "complete" || m.status === "completed"
        return {
          ...tc,
          status: isInterrupted
            ? ("suspended" as const)
            : isErrorStatus
              ? ("error" as const)
              : isCompleted
                ? ("completed" as const)
                : ("error" as const),
          ...(isErrorStatus && !tc.errorText
            ? { errorText: "Turn failed before tool resolution." }
            : {}),
        }
      }
      return tc
    })

    // Collapse superseded retry attempts for successful tools
    const successfulRetries = normalizedTools.filter(
      (tc) => tc.status === "completed" && Boolean(tc.retryOf)
    )
    if (successfulRetries.length > 0) {
      const supersededIds = new Set<string>()
      for (const sr of successfulRetries) {
        let curr: string | undefined = sr.retryOf
        while (curr) {
          supersededIds.add(curr)
          const parent = normalizedTools.find((t) => t.id === curr)
          curr = parent?.retryOf
        }
      }
      normalizedTools = normalizedTools.filter(
        (tc) => !supersededIds.has(tc.id)
      )
    }

    return {
      id,
      role,
      content: text,
      thinking: thinking || undefined,
      toolCalls: normalizedTools.length > 0 ? normalizedTools : undefined,
    }
  })
}

/**
 * Applies a series of AgentEvent items to a target assistant message within the messages list
 * in a single atomic batch pass, preventing excessive React render schedules.
 */
export function applyEventsToMessages(
  messages: ChatMessage[],
  assistantMsgId: string,
  events: AgentEvent[],
  executedToolsOut?: Set<string>
): ChatMessage[] {
  if (events.length === 0) return messages

  return messages.map((msg) => {
    if (msg.id !== assistantMsgId) return msg
    if (msg.isTerminal) return msg

    let content = msg.content || ""
    let thinking = msg.thinking || ""
    let toolCalls = msg.toolCalls ? [...msg.toolCalls] : []
    let error = msg.error
    let isTerminal = Boolean(msg.isTerminal)

    for (const event of events) {
      if (isTerminal) break

      switch (event.type) {
        case "content:delta":
          content += event.text
          break

        case "thinking:delta":
          thinking += event.text
          break

        case "tool:called": {
          executedToolsOut?.add(event.name)
          const existingIdx = toolCalls.findIndex(
            (tc) => tc.id === event.callId
          )
          if (existingIdx >= 0) {
            const existing = toolCalls[existingIdx]
            toolCalls[existingIdx] = {
              ...existing,
              name: event.name || existing.name,
              args: event.args ?? existing.args,
              retryOf: event.retryOf ?? existing.retryOf,
              attempt: event.attempt ?? existing.attempt,
              status:
                existing.status === "completed" ||
                existing.status === "error" ||
                existing.status === "rejected" ||
                existing.status === "skipped"
                  ? existing.status
                  : "running",
            }
          } else {
            toolCalls.push({
              id: event.callId,
              name: event.name,
              args: event.args,
              status: "running",
              retryOf: event.retryOf,
              attempt: event.attempt,
            })
          }
          break
        }

        case "tool:result": {
          const resObj = event.result as Record<string, unknown> | null
          const isRejected =
            resObj?.status === "rejected" || resObj?.status === "denied"
          const isSkipped = resObj?.status === "skipped"
          const hasObjError =
            event.result !== undefined &&
            typeof event.result === "object" &&
            event.result !== null &&
            Boolean((event.result as Record<string, unknown>).error)
          const isError = Boolean(event.isError || hasObjError)
          const derivedStatus = isError
            ? "error"
            : isRejected
              ? "rejected"
              : isSkipped
                ? "skipped"
                : "completed"

          const errorText = isError
            ? extractToolErrorText(event.result)
            : undefined

          let targetRetryOf = event.retryOf
          const existingIdx = toolCalls.findIndex(
            (tc) => tc.id === event.callId
          )

          if (existingIdx >= 0) {
            const existing = toolCalls[existingIdx]
            if (existing.name) executedToolsOut?.add(existing.name)
            if (!targetRetryOf && existing.retryOf) {
              targetRetryOf = existing.retryOf
            }

            // Monotonic terminal latch: once an attempt is completed, ignore duplicate/stale error results
            const isMonotonicCompleted =
              existing.status === "completed" &&
              isError &&
              (event.attempt ?? 1) <= (existing.attempt ?? 1)

            if (!isMonotonicCompleted) {
              toolCalls[existingIdx] = {
                ...existing,
                result: event.result,
                status: isError ? "error" : derivedStatus,
                errorText,
                retryOf: targetRetryOf,
                attempt: event.attempt ?? existing.attempt,
              }
            }
          } else {
            // Result arrived before tool:called (out-of-order event resilience)
            if (event.name) executedToolsOut?.add(event.name)
            toolCalls.push({
              id: event.callId,
              name: event.name || "tool",
              args: {},
              result: event.result,
              status: isError ? "error" : derivedStatus,
              errorText,
              retryOf: targetRetryOf,
              attempt: event.attempt,
            })
          }

          // When a retry attempt succeeds, collapse / remove prior failed attempts in the retry chain
          if (!isError && targetRetryOf) {
            const supersededIds = new Set<string>()
            let currentParentId: string | undefined = targetRetryOf
            while (currentParentId) {
              supersededIds.add(currentParentId)
              const parentCall = toolCalls.find((t) => t.id === currentParentId)
              currentParentId = parentCall?.retryOf
            }
            toolCalls = toolCalls.filter((tc) => !supersededIds.has(tc.id))
          }
          break
        }

        case "action:approval_required":
          toolCalls = toolCalls.map((tc) => {
            if (event.callId !== undefined && tc.id === event.callId) {
              return {
                ...tc,
                needsApproval: true,
                approvalId: event.approvalId,
                status: "pending_approval",
              }
            }
            return tc
          })
          break

        case "tool:executing": {
          const existingIdx = toolCalls.findIndex(
            (tc) => tc.id === event.callId
          )
          if (existingIdx >= 0) {
            const existing = toolCalls[existingIdx]
            const isAlreadyTerminal =
              existing.status === "completed" ||
              existing.status === "error" ||
              existing.status === "rejected" ||
              existing.status === "skipped"
            if (!isAlreadyTerminal) {
              toolCalls[existingIdx] = {
                ...existing,
                status: "running",
                retryOf: event.retryOf ?? existing.retryOf,
                attempt: event.attempt ?? existing.attempt,
              }
            }
          } else {
            // Executing event arrived before tool:called
            toolCalls.push({
              id: event.callId,
              name: event.name || "tool",
              args: {},
              status: "running",
              retryOf: event.retryOf,
              attempt: event.attempt,
            })
          }
          break
        }

        case "turn:suspended":
          toolCalls = toolCalls.map((tc) => {
            if (tc.needsApproval || tc.status === "pending_approval") return tc
            if (tc.status === "running") {
              return { ...tc, status: "suspended" as const }
            }
            return tc
          })
          break

        case "turn:completed":
          toolCalls = toolCalls.map((tc) => {
            if (tc.needsApproval || tc.status === "pending_approval") return tc
            if (tc.status === "running" || tc.status === "pending") {
              return { ...tc, status: "completed" }
            }
            return tc
          })
          isTerminal = true
          break

        case "turn:error":
          if (event.code === "aborted") {
            // Client-initiated stop: cleanly transition running tools to suspended without error state
            toolCalls = toolCalls.map((tc) => {
              if (tc.needsApproval || tc.status === "pending_approval")
                return tc
              if (tc.status === "running" || tc.status === "pending") {
                return { ...tc, status: "suspended" as const }
              }
              return tc
            })
            isTerminal = true
            break
          }
          toolCalls = toolCalls.map((tc) => {
            if (tc.needsApproval || tc.status === "pending_approval") return tc
            if (tc.status === "running" || tc.status === "pending") {
              return {
                ...tc,
                status: "error" as const,
                errorText: tc.errorText || event.message,
              }
            }
            return tc
          })
          error = { code: event.code, message: event.message }
          isTerminal = true
          break

        default:
          break
      }
    }

    return {
      ...msg,
      content,
      thinking,
      toolCalls,
      ...(error ? { error } : {}),
      ...(isTerminal ? { isTerminal: true } : {}),
    }
  })
}

function buildPayloadMessages(messages: ChatMessage[]): Array<{
  role: string
  content?: string | null
  parts?: unknown[]
}> {
  return messages.map((m) => {
    const parts: unknown[] = []
    if (m.thinking) parts.push({ type: "thinking", text: m.thinking })
    if (m.content) parts.push({ type: "text", text: m.content })
    if (Array.isArray(m.toolCalls)) {
      for (const tc of m.toolCalls) {
        if (tc.result !== undefined) {
          const isErr =
            tc.status === "error" ||
            Boolean((tc as any).isError) ||
            (tc.result as any)?.status === "rejected" ||
            (tc.result as any)?.status === "denied"
          parts.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.name,
            args: tc.args,
          })
          parts.push({
            type: "tool-result",
            toolCallId: tc.id,
            toolName: tc.name,
            result: tc.result ?? {},
            isError: isErr,
          })
        }
      }
    }
    return {
      role: m.role,
      content: m.content,
      parts,
    }
  })
}

export const CommandChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [activeTitle, setActiveTitle] = useState<string | undefined>(undefined)
  const [isHydrating, setIsHydrating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [chatError, setChatError] = useState<AgentChatError | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string>("")

  // Refs for stable action callbacks (advanced-use-latest, rerender-dependencies)
  const messagesRef = useRef<ChatMessage[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const threadIdRef = useRef<string | undefined>(threadId)
  useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])

  const selectedModelRef = useRef<string>(selectedModel)
  useEffect(() => {
    selectedModelRef.current = selectedModel
  }, [selectedModel])

  const isLoadingRef = useRef<boolean>(isLoading)
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  const lastPromptRef = useRef<string>(lastPrompt)
  useEffect(() => {
    lastPromptRef.current = lastPrompt
  }, [lastPrompt])

  const abortControllerRef = useRef<AbortController | null>(null)
  const isSubmittingRef = useRef<boolean>(false)
  const streamGenerationRef = useRef<number>(0)
  const loadGenerationRef = useRef<number>(0)
  const activeStreamRef = useRef<{
    abortController: AbortController
    reader: ReadableStreamDefaultReader<Uint8Array> | null
    generation: number
  } | null>(null)

  // Sync default model from server settings on first load
  const { data: modelsData } = useAIModels()
  useEffect(() => {
    if (modelsData?.defaultModel && !selectedModel) {
      setSelectedModel(modelsData.defaultModel)
    }
  }, [modelsData?.defaultModel, selectedModel])

  /**
   * Target query invalidation to avoid unnecessary broad network waterfall refetches (client-swr-dedup)
   */
  const invalidateAgentQueries = useCallback(
    (executedTools?: Set<string>) => {
      if (executedTools && executedTools.size === 0) return

      invalidateQueriesHelper({
        executedToolNames: executedTools,
        queryClient,
        threadId: threadIdRef.current,
      })
    },
    [queryClient]
  )

  /**
   * Reusable streaming pipeline for prompt execution and action approval resumption.
   */
  const executeStreamTurn = useCallback(
    async ({
      payloadMessages,
      targetThreadId,
      assistantMsgId,
      isResume = false,
    }: {
      payloadMessages: Array<{
        role: string
        content?: string | null
        parts?: unknown[]
      }>
      targetThreadId: string
      assistantMsgId: string
      isResume?: boolean
    }) => {
      const generation = ++streamGenerationRef.current
      isSubmittingRef.current = true
      setIsLoading(true)

      // Explicitly abort and cancel previous stream reader on new generation
      if (activeStreamRef.current) {
        activeStreamRef.current.abortController.abort()
        activeStreamRef.current.reader?.cancel().catch(() => {})
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController
      activeStreamRef.current = { abortController, reader: null, generation }
      const executedTools = new Set<string>()

      if (isResume) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, isTerminal: false } : msg
          )
        )
      }

      try {
        const res = await fetch(`${AUTH_SERVER_URL}/api/agent/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          credentials: "include",
          signal: abortController.signal,
          body: JSON.stringify({
            messages: payloadMessages,
            threadId: targetThreadId,
            forwardedProps: {
              model: selectedModelRef.current || null,
              resume: isResume,
            },
          }),
        })

        if (streamGenerationRef.current !== generation) return

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const code = body?.error?.code || `http_${res.status}`
          const message =
            body?.error?.message ||
            `Request failed with HTTP status ${res.status}`
          setChatError({ code, message })
          if (!isResume) {
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
          }
          return
        }

        if (!res.body) {
          throw new Error("No SSE response body returned from agent server")
        }

        const reader = res.body.getReader()
        if (activeStreamRef.current?.generation === generation) {
          activeStreamRef.current.reader = reader
        }
        const decoder = new TextDecoder()
        let buffer = ""
        let receivedTerminalEvent = false

        while (true) {
          const { done, value } = await reader.read()
          if (done || streamGenerationRef.current !== generation) {
            if (streamGenerationRef.current !== generation) {
              reader.cancel().catch(() => {})
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const { events: chunkEvents, remainder } = parseSseChunk(buffer)
          buffer = remainder

          if (streamGenerationRef.current !== generation) break

          if (chunkEvents.length > 0) {
            for (const ev of chunkEvents) {
              if (
                ev.type === "turn:completed" ||
                ev.type === "turn:suspended" ||
                ev.type === "turn:error"
              ) {
                receivedTerminalEvent = true
              }
            }
            setMessages((prev) =>
              applyEventsToMessages(
                prev,
                assistantMsgId,
                chunkEvents,
                executedTools
              )
            )
          }
        }

        if (streamGenerationRef.current !== generation) return

        // Flush any remaining bytes from decoder buffer at EOF before parsing trailing buffer
        buffer += decoder.decode()

        // Process any trailing bytes at EOF
        const trailingEvents = parseSseTrailingBuffer(buffer)
        if (trailingEvents.length > 0) {
          for (const ev of trailingEvents) {
            if (
              ev.type === "turn:completed" ||
              ev.type === "turn:suspended" ||
              ev.type === "turn:error"
            ) {
              receivedTerminalEvent = true
            }
          }
          setMessages((prev) =>
            applyEventsToMessages(
              prev,
              assistantMsgId,
              trailingEvents,
              executedTools
            )
          )
        }

        // If the stream completed without an explicit terminal event (e.g. abrupt EOF),
        // reconcile as error outcome so running tools do not falsely display as completed.
        if (!receivedTerminalEvent) {
          const errPayload: AgentChatError = {
            code: "stream_interrupted",
            message: "Stream closed unexpectedly before turn completed",
          }
          setChatError(errPayload)
          setMessages((prev) =>
            reconcileTerminalTurn(prev, assistantMsgId, "error", errPayload)
          )
        }

        invalidateAgentQueries(executedTools)
      } catch (err: unknown) {
        if (streamGenerationRef.current !== generation) return

        const isAbort =
          (err as Error)?.name === "AbortError" ||
          (err as any)?.code === "aborted" ||
          abortController.signal.aborted
        if (isAbort) {
          setMessages((prev) =>
            reconcileTerminalTurn(prev, assistantMsgId, "suspended")
          )
        } else {
          const message =
            err instanceof Error ? err.message : "Agent stream failed"
          const errPayload: AgentChatError = { code: "stream_failed", message }
          setChatError(errPayload)
          setMessages((prev) =>
            reconcileTerminalTurn(prev, assistantMsgId, "error", errPayload)
          )
        }
      } finally {
        if (streamGenerationRef.current === generation) {
          isSubmittingRef.current = false
          setIsLoading(false)
        }
      }
    },
    [invalidateAgentQueries]
  )

  // TanStack Query Mutation for Action Approval Resolution
  const resolveActionMutation = useMutation({
    mutationFn: async ({
      approvalId,
      approved,
      feedback,
    }: {
      approvalId: string
      approved: boolean
      feedback?: string
    }) => {
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/actions/${approvalId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ approved, feedback }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const error = new Error(data?.error?.message || `HTTP ${res.status}`)
        ;(error as any).code = data?.error?.code
        throw error
      }
      return await res.json()
    },
    onSuccess: (data, variables) => {
      let resolvedToolName: string | undefined = data?.toolName
      const isError = Boolean(
        data?.isError || data?.status === "error" || data?.error
      )
      const errorText = isError
        ? data?.error?.message ||
          (typeof data?.result === "string"
            ? data.result
            : extractToolErrorText(data?.result)) ||
          "Action execution failed"
        : undefined

      let updatedMessages: ChatMessage[] = []
      let targetAssistantMsgId: string | undefined

      setMessages((prev) => {
        const next = prev.map((msg) => {
          if (!msg.toolCalls) return msg
          const hasMatchingCall = msg.toolCalls.some(
            (tc) =>
              tc.approvalId === variables.approvalId ||
              tc.id === variables.approvalId
          )
          if (!hasMatchingCall) return msg
          targetAssistantMsgId = msg.id

          return {
            ...msg,
            toolCalls: msg.toolCalls.map((tc) => {
              if (
                tc.approvalId === variables.approvalId ||
                tc.id === variables.approvalId
              ) {
                if (!resolvedToolName && tc.name) {
                  resolvedToolName = tc.name
                }
                return {
                  ...tc,
                  status: isError
                    ? "error"
                    : variables.approved
                      ? "approved"
                      : "rejected",
                  result:
                    data?.result ??
                    (isError ? { error: errorText } : undefined),
                  errorText,
                  needsApproval: false,
                }
              }
              return tc
            }),
          }
        })
        updatedMessages = next
        return next
      })

      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] })
      if (!isError && variables.approved && resolvedToolName) {
        invalidateAgentQueries(new Set([resolvedToolName]))
      } else {
        invalidateAgentQueries()
      }

      // Resume agent turn stream with tool result appended
      if (!isError && targetAssistantMsgId && threadIdRef.current) {
        const payload = buildPayloadMessages(updatedMessages)
        void executeStreamTurn({
          payloadMessages: payload,
          targetThreadId: threadIdRef.current,
          assistantMsgId: targetAssistantMsgId,
          isResume: true,
        })
      }
    },
    onError: (err: Error, variables) => {
      const errorMessage = err.message || "Failed to resolve action approval"
      const errorCode = (err as any).code || "approval_failed"
      setChatError({
        code: errorCode,
        message: errorMessage,
      })
      // Defensively transition the card away from pending_approval to error state
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.toolCalls) return msg
          return {
            ...msg,
            toolCalls: msg.toolCalls.map((tc) => {
              if (
                tc.approvalId === variables.approvalId ||
                tc.id === variables.approvalId
              ) {
                return {
                  ...tc,
                  status: "error",
                  errorText: errorMessage,
                  needsApproval: false,
                }
              }
              return tc
            }),
          }
        })
      )
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] })
      invalidateAgentQueries()
    },
  })

  const sendPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSubmittingRef.current || isLoadingRef.current) return
      isSubmittingRef.current = true
      setChatError(null)
      setLastPrompt(trimmed)

      let targetThreadId = threadIdRef.current
      if (!targetThreadId) {
        targetThreadId = crypto.randomUUID()
        setThreadId(targetThreadId)
        threadIdRef.current = targetThreadId
        setActiveTitle(trimmed.slice(0, 60))
        navigate({
          to: "/$id",
          params: { id: targetThreadId },
          replace: true,
        })
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }

      const assistantMsgId = crypto.randomUUID()
      const initialAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
      }

      const nextMessages = [...messagesRef.current, userMsg]
      setMessages([...nextMessages, initialAssistantMsg])

      const payloadMessages = buildPayloadMessages(nextMessages)

      await executeStreamTurn({
        payloadMessages,
        targetThreadId,
        assistantMsgId,
        isResume: false,
      })
    },
    [navigate, executeStreamTurn]
  )

  const stop = useCallback(() => {
    streamGenerationRef.current++
    if (activeStreamRef.current) {
      activeStreamRef.current.abortController.abort()
      activeStreamRef.current.reader?.cancel().catch(() => {})
      activeStreamRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    isSubmittingRef.current = false
    setIsLoading(false)
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.toolCalls) return msg
        const hasRunning = msg.toolCalls.some(
          (tc) =>
            (tc.status === "running" || tc.status === "pending") &&
            !tc.needsApproval
        )
        if (!hasRunning) return msg
        return {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) => {
            if (tc.needsApproval || tc.status === "pending_approval") return tc
            if (tc.status === "running" || tc.status === "pending") {
              return { ...tc, status: "suspended" as const }
            }
            return tc
          }),
        }
      })
    )
  }, [])

  const retryLastPrompt = useCallback(async () => {
    const promptToRetry = lastPromptRef.current
    if (!promptToRetry || isLoadingRef.current) return
    await sendPrompt(promptToRetry)
  }, [sendPrompt])

  const resolveMutationRef = useRef(resolveActionMutation)
  useEffect(() => {
    resolveMutationRef.current = resolveActionMutation
  }, [resolveActionMutation])

  const approveTool = useCallback(async (approvalId: string) => {
    try {
      await resolveMutationRef.current.mutateAsync({
        approvalId,
        approved: true,
      })
    } catch {
      // Handled in onError callback of resolveActionMutation
    }
  }, [])

  const rejectTool = useCallback(async (approvalId: string) => {
    try {
      await resolveMutationRef.current.mutateAsync({
        approvalId,
        approved: false,
      })
    } catch {
      // Handled in onError callback of resolveActionMutation
    }
  }, [])

  const clearError = useCallback(() => {
    setChatError(null)
  }, [])

  const loadThread = useCallback(
    async (id: string) => {
      const cleanId = id.trim()
      if (!cleanId) return

      // Abort any ongoing stream before switching threads
      stop()

      const currentGen = ++loadGenerationRef.current
      setIsHydrating(true)
      setThreadId(cleanId)
      threadIdRef.current = cleanId
      setChatError(null)

      try {
        const data = await queryClient.fetchQuery(
          conversationDetailQueryOptions(cleanId)
        )

        // Drop response if a newer load was initiated or thread changed
        if (
          loadGenerationRef.current !== currentGen ||
          threadIdRef.current !== cleanId
        ) {
          return
        }

        setActiveTitle(data.conversation.title)

        if (Array.isArray(data.messages)) {
          const loaded: ChatMessage[] = normalizePersistedMessages(
            data.messages
          )
          setMessages(loaded)
        }
      } catch (err: unknown) {
        if (
          loadGenerationRef.current !== currentGen ||
          threadIdRef.current !== cleanId
        ) {
          return
        }
        setChatError({
          code: "load_failed",
          message: err instanceof Error ? err.message : "Failed to load thread",
        })
      } finally {
        if (loadGenerationRef.current === currentGen) {
          setIsHydrating(false)
        }
      }
    },
    [queryClient, stop]
  )

  const resetNewChat = useCallback(() => {
    if (isLoadingRef.current) return
    loadGenerationRef.current++
    setThreadId(undefined)
    threadIdRef.current = undefined
    setActiveTitle(undefined)
    setMessages([])
    setChatError(null)
    setIsHydrating(false)
  }, [])

  const isCurrentThread = useCallback((id: string) => {
    return threadIdRef.current === id
  }, [])

  const stateValue = useMemo<CommandChatState>(
    () => ({
      messages,
      isLoading,
      isHydrating,
      threadId,
      activeTitle:
        activeTitle ||
        (messages.length > 0 ? "Conversation" : "New Conversation"),
      selectedModel,
      chatError,
    }),
    [
      messages,
      isLoading,
      isHydrating,
      threadId,
      activeTitle,
      selectedModel,
      chatError,
    ]
  )

  const actionsValue = useMemo<CommandChatActions>(
    () => ({
      setSelectedModel,
      sendPrompt,
      stop,
      retryLastPrompt,
      approveTool,
      rejectTool,
      clearError,
      loadThread,
      resetNewChat,
      isCurrentThread,
    }),
    [
      sendPrompt,
      stop,
      retryLastPrompt,
      approveTool,
      rejectTool,
      clearError,
      loadThread,
      resetNewChat,
      isCurrentThread,
    ]
  )

  return (
    <CommandChatStateContext.Provider value={stateValue}>
      <CommandChatActionsContext.Provider value={actionsValue}>
        {children}
      </CommandChatActionsContext.Provider>
    </CommandChatStateContext.Provider>
  )
}

export function useCommandChatState(): CommandChatState {
  const ctx = useContext(CommandChatStateContext)
  if (!ctx) {
    throw new Error(
      "useCommandChatState must be used within a CommandChatProvider"
    )
  }
  return ctx
}

export function useCommandChatActions(): CommandChatActions {
  const ctx = useContext(CommandChatActionsContext)
  if (!ctx) {
    throw new Error(
      "useCommandChatActions must be used within a CommandChatProvider"
    )
  }
  return ctx
}

export function useCommandChatContext(): CommandChatContextValue {
  const state = useCommandChatState()
  const actions = useCommandChatActions()
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}
