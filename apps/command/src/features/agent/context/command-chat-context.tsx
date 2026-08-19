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
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  thinking?: string
  openuiCode?: string
  toolCalls?: ToolCallItem[]
  error?: AgentChatError
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

    let content = msg.content || ""
    let thinking = msg.thinking || ""
    let toolCalls = msg.toolCalls ? [...msg.toolCalls] : []
    let error = msg.error

    for (const event of events) {
      switch (event.type) {
        case "content:delta":
          content += event.text
          break

        case "thinking:delta":
          thinking += event.text
          break

        case "tool:called":
          executedToolsOut?.add(event.name)
          toolCalls.push({
            id: event.callId,
            name: event.name,
            args: event.args,
            status: "running",
          })
          break

        case "tool:result": {
          const resObj = event.result as Record<string, unknown> | null
          const isRejected =
            resObj?.status === "rejected" || resObj?.status === "denied"
          const isSkipped = resObj?.status === "skipped"
          const derivedStatus = event.isError
            ? "error"
            : isRejected
              ? "rejected"
              : isSkipped
                ? "skipped"
                : "completed"

          toolCalls = toolCalls.map((tc) => {
            if (tc.id === event.callId) {
              if (tc.name) executedToolsOut?.add(tc.name)
              const hasObjError =
                event.result !== undefined &&
                typeof event.result === "object" &&
                event.result !== null &&
                Boolean((event.result as Record<string, unknown>).error)
              const isError = Boolean(event.isError || hasObjError)
              return {
                ...tc,
                result: event.result,
                status: isError ? "error" : derivedStatus,
                errorText: isError
                  ? extractToolErrorText(event.result)
                  : undefined,
              }
            }
            return tc
          })
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

        case "tool:executing":
          toolCalls = toolCalls.map((tc) => {
            if (tc.id === event.callId || tc.name === event.name) {
              return { ...tc, status: "running" }
            }
            return tc
          })
          break

        case "turn:suspended":
          if (event.reason === "budget_cap") {
            toolCalls = toolCalls.map((tc) => {
              if (tc.status === "running") {
                return { ...tc, status: "suspended" }
              }
              return tc
            })
          }
          break

        case "turn:error":
          if (event.code === "aborted") {
            // Client-initiated stop: cleanly transition running tools to suspended without error state
            toolCalls = toolCalls.map((tc) => {
              if (tc.status === "running") {
                return { ...tc, status: "suspended" as const }
              }
              return tc
            })
            break
          }
          toolCalls = toolCalls.map((tc) => {
            if (tc.status === "running") {
              return { ...tc, status: "error" as const }
            }
            return tc
          })
          error = { code: event.code, message: event.message }
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
      error,
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
    (executedToolNames?: Set<string>) => {
      invalidateQueriesHelper({
        queryClient,
        executedToolNames,
        threadId: threadIdRef.current,
      })
    },
    [queryClient]
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
                if (!resolvedToolName && tc.name) {
                  resolvedToolName = tc.name
                }
                return {
                  ...tc,
                  status: variables.approved ? "approved" : "rejected",
                  result: data.result,
                  needsApproval: false,
                }
              }
              return tc
            }),
          }
        })
      )
      queryClient.invalidateQueries({ queryKey: ["agent-approvals"] })
      if (variables.approved && resolvedToolName) {
        invalidateAgentQueries(new Set([resolvedToolName]))
      } else {
        invalidateAgentQueries()
      }
    },
    onError: (err: Error) => {
      setChatError({
        code: (err as any).code || "approval_failed",
        message: err.message || "Failed to resolve action approval",
      })
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
        toolCalls: [],
      }

      setMessages((prev) => [...prev, userMsg, initialAssistantMsg])
      setIsLoading(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const executedTools = new Set<string>()

      try {
        const payloadMessages = [...messagesRef.current, userMsg].map((m) => {
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
            },
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const code = body?.error?.code || `http_${res.status}`
          const message =
            body?.error?.message ||
            `Request failed with HTTP status ${res.status}`
          setChatError({ code, message })
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
          isSubmittingRef.current = false
          setIsLoading(false)
          return
        }

        if (!res.body) {
          throw new Error("No SSE response body returned from agent server")
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() ?? ""

          // Batch all parseable events arriving in this read chunk
          const chunkEvents: AgentEvent[] = []

          for (const block of lines) {
            if (!block.trim() || block.startsWith(":")) continue // Skip heartbeats/comments
            const dataLine = block
              .split("\n")
              .find((l) => l.startsWith("data: "))
            if (!dataLine) continue

            const rawJson = dataLine.slice(6).trim()
            try {
              const eventParsed = JSON.parse(rawJson)
              const eventValidation = agentEventSchema.safeParse(eventParsed)
              if (eventValidation.success) {
                chunkEvents.push(eventValidation.data)
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }

          // Dispatch a single batched state update per read chunk
          if (chunkEvents.length > 0) {
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

        invalidateAgentQueries(executedTools)
      } catch (err: unknown) {
        const isAbort =
          (err as Error)?.name === "AbortError" ||
          (err as any)?.code === "aborted" ||
          abortController.signal.aborted
        if (!isAbort) {
          const message =
            err instanceof Error ? err.message : "Agent stream failed"
          setChatError({ code: "stream_failed", message })
          setMessages((prev) =>
            prev.map((msg) => {
              if (
                msg.id === assistantMsgId &&
                !msg.content &&
                (!msg.toolCalls || msg.toolCalls.length === 0)
              ) {
                return {
                  ...msg,
                  error: { code: "stream_failed", message },
                }
              }
              return msg
            })
          )
        }
      } finally {
        isSubmittingRef.current = false
        setIsLoading(false)
      }
    },
    [navigate, invalidateAgentQueries]
  )

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      isSubmittingRef.current = false
      setIsLoading(false)
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.toolCalls) return msg
          const hasRunning = msg.toolCalls.some((tc) => tc.status === "running")
          if (!hasRunning) return msg
          return {
            ...msg,
            toolCalls: msg.toolCalls.map((tc) =>
              tc.status === "running"
                ? { ...tc, status: "suspended" as const }
                : tc
            ),
          }
        })
      )
    }
  }, [])

  const retryLastPrompt = useCallback(async () => {
    if (lastPromptRef.current) {
      await sendPrompt(lastPromptRef.current)
    }
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
      const cleanId = typeof id === "string" ? id.trim() : ""
      if (!cleanId) return
      if (threadIdRef.current === cleanId && messagesRef.current.length > 0)
        return

      setIsHydrating(true)
      setThreadId(cleanId)
      threadIdRef.current = cleanId

      try {
        const data = await queryClient.ensureQueryData(
          conversationDetailQueryOptions(cleanId)
        )
        if (data.conversation?.title) {
          setActiveTitle(data.conversation.title)
        }

      if (Array.isArray(data.messages)) {
        const loaded: ChatMessage[] = data.messages.map((m: any) => {
          let text = ""
          let thinking = ""
          const toolCalls: ToolCallItem[] = []

          if (Array.isArray(m.parts)) {
            for (const p of m.parts) {
              if (p?.type === "text") {
                text += p.text ?? p.content ?? ""
              } else if (p?.type === "thinking") {
                thinking += p.text ?? p.thinking ?? p.content ?? ""
              } else if (
                p?.type === "tool-call" ||
                p?.type === "tool-invocation"
              ) {
                toolCalls.push({
                  id: String(p.id ?? p.toolCallId ?? "tool"),
                  name: String(p.name ?? p.toolName ?? "tool"),
                  args: p.args ?? p.input ?? {},
                  status: "pending",
                })
              } else if (p?.type === "tool-result") {
                const existing = toolCalls.find((tc) => tc.id === p.toolCallId)
                const resObj = (p.result ?? p.output) as any
                const isRejected =
                  resObj?.status === "rejected" ||
                  resObj?.status === "denied" ||
                  p.status === "rejected" ||
                  p.status === "denied"
                const isSkipped =
                  resObj?.status === "skipped" || p.status === "skipped"
                const hasObjError =
                  resObj &&
                  typeof resObj === "object" &&
                  Boolean(resObj.error)
                const isError = Boolean(p.isError || hasObjError)
                const derivedStatus = isError
                  ? "error"
                  : isRejected
                    ? "rejected"
                    : isSkipped
                      ? "skipped"
                      : "completed"

                const errorText = isError
                  ? extractToolErrorText(p.result ?? p.output)
                  : undefined

                if (existing) {
                  existing.result = p.result ?? p.output
                  existing.status = derivedStatus
                  if (isError) {
                    existing.errorText = errorText
                  }
                } else {
                  toolCalls.push({
                    id: String(p.toolCallId ?? "tool"),
                    name: String(p.toolName ?? "tool"),
                    result: p.result ?? p.output,
                    status: derivedStatus,
                    errorText,
                  })
                }
              } else if (p?.type === "approval-requested") {
                const resolvedApprovalId = String(
                  p.approvalId ?? p.resumeId ?? p.id ?? "approval"
                )
                const existing = toolCalls.find(
                  (tc) =>
                    (p.callId !== undefined && tc.id === String(p.callId)) ||
                    (tc.name === String(p.toolName ?? "action") &&
                      tc.status === "pending")
                )
                if (existing) {
                  existing.status = "pending_approval"
                  existing.needsApproval = true
                  existing.approvalId = resolvedApprovalId
                } else {
                  toolCalls.push({
                    id: resolvedApprovalId,
                    name: String(p.toolName ?? "action"),
                    args: p.toolArgs ?? p.args ?? {},
                    status: "pending_approval",
                    needsApproval: true,
                    approvalId: resolvedApprovalId,
                  })
                }
              }
            }
          }

          return {
            id: m.id,
            role: m.role,
            content: text,
            thinking: thinking || undefined,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          }
        })

        setMessages(loaded)
      }
    } catch (err: unknown) {
      setChatError({
        code: "load_failed",
        message: err instanceof Error ? err.message : "Failed to load thread",
      })
    } finally {
      setIsHydrating(false)
    }
  }, [queryClient])

  const resetNewChat = useCallback(() => {
    if (isLoadingRef.current) return
    setThreadId(undefined)
    threadIdRef.current = undefined
    setActiveTitle(undefined)
    setMessages([])
    setChatError(null)
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
