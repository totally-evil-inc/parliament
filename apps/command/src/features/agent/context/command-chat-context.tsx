import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type AgentEvent, agentEventSchema } from "@workspace/agent"
import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useAIModels } from "../hooks/use-ai-models"

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

export interface CommandChatContextValue {
  messages: ChatMessage[]
  isLoading: boolean
  isHydrating: boolean
  threadId?: string
  activeTitle?: string
  selectedModel: string
  setSelectedModel: (model: string) => void
  chatError: AgentChatError | null
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

const CommandChatContext = createContext<CommandChatContextValue | null>(null)

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

  const threadIdRef = useRef<string | undefined>(threadId)
  useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])

  const abortControllerRef = useRef<AbortController | null>(null)
  const isSubmittingRef = useRef<boolean>(false)

  // Sync default model from server settings on first load
  const { data: modelsData } = useAIModels()
  useEffect(() => {
    if (modelsData?.defaultModel && !selectedModel) {
      setSelectedModel(modelsData.defaultModel)
    }
  }, [modelsData?.defaultModel, selectedModel])

  const invalidateAgentQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
    queryClient.invalidateQueries({ queryKey: ["proposals"] })
    queryClient.invalidateQueries({ queryKey: ["invoices"] })
    queryClient.invalidateQueries({ queryKey: ["scheduled-dispatches"] })
    queryClient.invalidateQueries({ queryKey: ["deals"] })
    queryClient.invalidateQueries({ queryKey: ["customers"] })
    queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
    queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
    if (threadIdRef.current) {
      queryClient.invalidateQueries({
        queryKey: ["agent", "conversations", threadIdRef.current],
      })
    }
  }, [queryClient])

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
      // Update local tool state
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
      invalidateAgentQueries()
    },
    onError: (err: Error) => {
      setChatError({
        code: (err as any).code || "approval_failed",
        message: err.message || "Failed to resolve action approval",
      })
      // Sync queries on conflict or error
      invalidateAgentQueries()
    },
  })

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!text.trim() || isSubmittingRef.current || isLoading) return
      isSubmittingRef.current = true
      setChatError(null)
      setLastPrompt(text)

      let targetThreadId = threadIdRef.current
      if (!targetThreadId) {
        targetThreadId = crypto.randomUUID()
        setThreadId(targetThreadId)
        threadIdRef.current = targetThreadId
        setActiveTitle(text.trim().slice(0, 60))
        navigate({
          to: "/$id",
          params: { id: targetThreadId },
          replace: true,
        })
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
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

      try {
        const payloadMessages = [...messages, userMsg].map((m) => {
          const parts: any[] = []
          if (m.thinking) parts.push({ type: "thinking", text: m.thinking })
          if (m.content) parts.push({ type: "text", text: m.content })
          if (Array.isArray(m.toolCalls)) {
            for (const tc of m.toolCalls) {
              // Invariant: Only send tool-call if it has a paired result,
              // preventing provider schema rejections (HTTP 400) and never
              // fabricating `{}` outcomes for unexecuted (e.g. pending approval) calls.
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
              model: selectedModel || null,
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
          // Remove the optimistic assistant placeholder on error response
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
              if (!eventValidation.success) continue

              const event: AgentEvent = eventValidation.data

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg

                  switch (event.type) {
                    case "content:delta":
                      return {
                        ...msg,
                        content: (msg.content || "") + event.text,
                      }

                    case "thinking:delta":
                      return {
                        ...msg,
                        thinking: (msg.thinking || "") + event.text,
                      }

                    case "tool:called": {
                      const existing = msg.toolCalls ?? []
                      return {
                        ...msg,
                        toolCalls: [
                          ...existing,
                          {
                            id: event.callId,
                            name: event.name,
                            args: event.args,
                            status: "running",
                          },
                        ],
                      }
                    }

                    case "tool:result": {
                      const resObj = event.result as any
                      const isRejected =
                        resObj?.status === "rejected" ||
                        resObj?.status === "denied"
                      const isSkipped = resObj?.status === "skipped"
                      const derivedStatus = event.isError
                        ? "error"
                        : isRejected
                          ? "rejected"
                          : isSkipped
                            ? "skipped"
                            : "completed"

                      const updatedTools = (msg.toolCalls ?? []).map((tc) => {
                        if (tc.id === event.callId) {
                          return {
                            ...tc,
                            result: event.result,
                            status: derivedStatus,
                            errorText: event.isError
                              ? String(event.result)
                              : undefined,
                          }
                        }
                        return tc
                      })
                      return { ...msg, toolCalls: updatedTools }
                    }

                    case "action:approval_required": {
                      const updatedTools = (msg.toolCalls ?? []).map((tc) => {
                        if (
                          event.callId !== undefined &&
                          tc.id === event.callId
                        ) {
                          return {
                            ...tc,
                            needsApproval: true,
                            approvalId: event.approvalId,
                            status: "pending_approval",
                          }
                        }
                        return tc
                      })
                      return { ...msg, toolCalls: updatedTools }
                    }

                    case "tool:executing": {
                      const updatedTools = (msg.toolCalls ?? []).map((tc) => {
                        if (tc.id === event.callId || tc.name === event.name) {
                          return { ...tc, status: "running" }
                        }
                        return tc
                      })
                      return { ...msg, toolCalls: updatedTools }
                    }

                    case "turn:suspended": {
                      if (event.reason === "budget_cap") {
                        const updatedTools = (msg.toolCalls ?? []).map((tc) => {
                          if (tc.status === "running") {
                            return { ...tc, status: "suspended" }
                          }
                          return tc
                        })
                        return { ...msg, toolCalls: updatedTools }
                      }
                      return msg
                    }

                    case "turn:error": {
                      const updatedTools = (msg.toolCalls ?? []).map((tc) => {
                        if (tc.status === "running") {
                          return { ...tc, status: "error" as const }
                        }
                        return tc
                      })
                      return {
                        ...msg,
                        toolCalls: updatedTools,
                        error: { code: event.code, message: event.message },
                      }
                    }

                    default:
                      return msg
                  }
                })
              )
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }

        invalidateAgentQueries()
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          const message =
            err instanceof Error ? err.message : "Agent stream failed"
          setChatError({ code: "stream_failed", message })
          // If stream failed before any content was emitted, update the assistant message
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
    [isLoading, messages, navigate, selectedModel, invalidateAgentQueries]
  )

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      isSubmittingRef.current = false
      setIsLoading(false)
      // Transition running tools to suspended state
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
    if (lastPrompt) {
      await sendPrompt(lastPrompt)
    }
  }, [lastPrompt, sendPrompt])

  const approveTool = useCallback(
    async (approvalId: string) => {
      try {
        await resolveActionMutation.mutateAsync({ approvalId, approved: true })
      } catch {
        // Handled in onError callback of resolveActionMutation
      }
    },
    [resolveActionMutation]
  )

  const rejectTool = useCallback(
    async (approvalId: string) => {
      try {
        await resolveActionMutation.mutateAsync({ approvalId, approved: false })
      } catch {
        // Handled in onError callback of resolveActionMutation
      }
    },
    [resolveActionMutation]
  )

  const clearError = useCallback(() => {
    setChatError(null)
  }, [])

  const loadThread = useCallback(
    async (id: string) => {
      if (threadIdRef.current === id && messages.length > 0) return

      setIsHydrating(true)
      setThreadId(id)
      threadIdRef.current = id

      try {
        const res = await fetch(
          `${AUTH_SERVER_URL}/api/agent/conversations/${id}`,
          {
            credentials: "include",
          }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
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
                  const existing = toolCalls.find(
                    (tc) => tc.id === p.toolCallId
                  )
                  const resObj = (p.result ?? p.output) as any
                  const isRejected =
                    resObj?.status === "rejected" ||
                    resObj?.status === "denied" ||
                    p.status === "rejected" ||
                    p.status === "denied"
                  const isSkipped =
                    resObj?.status === "skipped" || p.status === "skipped"
                  const derivedStatus = p.isError
                    ? "error"
                    : isRejected
                      ? "rejected"
                      : isSkipped
                        ? "skipped"
                        : "completed"

                  if (existing) {
                    existing.result = p.result ?? p.output
                    existing.status = derivedStatus
                    if (p.isError) {
                      existing.errorText = String(p.result ?? p.output ?? "")
                    }
                  } else {
                    toolCalls.push({
                      id: String(p.toolCallId ?? "tool"),
                      name: String(p.toolName ?? "tool"),
                      result: p.result ?? p.output,
                      status: derivedStatus,
                      errorText: p.isError
                        ? String(p.result ?? p.output ?? "")
                        : undefined,
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
    },
    [messages.length]
  )

  const resetNewChat = useCallback(() => {
    if (isLoading) return
    setThreadId(undefined)
    threadIdRef.current = undefined
    setActiveTitle(undefined)
    setMessages([])
    setChatError(null)
  }, [isLoading])

  const isCurrentThread = useCallback((id: string) => {
    return threadIdRef.current === id
  }, [])

  return (
    <CommandChatContext.Provider
      value={{
        messages,
        isLoading,
        isHydrating,
        threadId,
        activeTitle:
          activeTitle ||
          (messages.length > 0 ? "Conversation" : "New Conversation"),
        selectedModel,
        setSelectedModel,
        chatError,
        sendPrompt,
        stop,
        retryLastPrompt,
        approveTool,
        rejectTool,
        clearError,
        loadThread,
        resetNewChat,
        isCurrentThread,
      }}
    >
      {children}
    </CommandChatContext.Provider>
  )
}

export function useCommandChatContext() {
  const ctx = useContext(CommandChatContext)
  if (!ctx) {
    throw new Error(
      "useCommandChatContext must be used within a CommandChatProvider"
    )
  }
  return ctx
}
