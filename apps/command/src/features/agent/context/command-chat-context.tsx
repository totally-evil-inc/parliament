import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
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

export interface CommandChatContextValue {
  messages: any[]
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
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [chatError, setChatError] = useState<AgentChatError | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string>("")

  const threadIdRef = useRef<string | undefined>(threadId)
  useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])

  // Sync default model from server settings on first load
  const { data: modelsData } = useAIModels()
  useEffect(() => {
    if (modelsData?.defaultModel && !selectedModel) {
      setSelectedModel(modelsData.defaultModel)
    }
  }, [modelsData?.defaultModel, selectedModel])

  const chat = (useChat as any)({
    connection: fetchServerSentEvents(`${AUTH_SERVER_URL}/api/agent/chat`, {
      credentials: "include",
      fetchClient: (async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          let updatedInit = init
          if (init?.body && typeof init.body === "string") {
            try {
              const parsed = JSON.parse(init.body)
              if (threadIdRef.current) {
                parsed.threadId = threadIdRef.current
                updatedInit = {
                  ...init,
                  body: JSON.stringify(parsed),
                }
              }
            } catch {
              // ignore json parse errors
            }
          }
          const response = await fetch(input, updatedInit)
          if (!response.ok) {
            const body = await response.json().catch(() => null)
            const code = body?.error?.code || `http_${response.status}`
            const message =
              body?.error?.message ||
              `Request failed with HTTP status ${response.status}`
            const errObj = { code, message }
            setChatError(errObj)
            throw new Error(`${code}: ${message}`)
          }
          setChatError(null)
          return response
        } catch (err) {
          if (err instanceof Error) {
            setChatError({
              code: "connection_error",
              message: err.message || "Failed to connect to agent server",
            })
          } else {
            setChatError({
              code: "unknown_stream_error",
              message: "An unknown stream error occurred",
            })
          }
          throw err
        }
      }) as typeof fetch,
    }),
    forwardedProps: {
      model: selectedModel || null,
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      if (threadIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: ["agent", "conversations", threadIdRef.current],
        })
      }
    },
    onError: (err: any) => {
      const message = err?.message || "Agent request encountered an error"
      setChatError({
        code: "agent_error",
        message,
      })
    },
  })

  const sendPrompt = useCallback(
    async (text: string) => {
      if (!text.trim()) return
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

      try {
        await chat.sendMessage(text)
      } catch (err: any) {
        setChatError({
          code: "send_failed",
          message: err?.message || "Failed to send prompt to agent",
        })
      }
    },
    [chat, navigate]
  )

  const approveTool = useCallback(
    async (approvalId: string) => {
      if (!approvalId || typeof chat.addToolApprovalResponse !== "function") {
        setChatError({
          code: "approval_unavailable",
          message:
            "This approval request cannot be resumed. Please retry the request.",
        })
        return
      }
      setChatError(null)
      try {
        await chat.addToolApprovalResponse({ id: approvalId, approved: true })
      } catch (err: any) {
        setChatError({
          code: "approval_failed",
          message: err?.message || "Failed to approve agent action",
        })
      }
    },
    [chat]
  )

  const rejectTool = useCallback(
    async (approvalId: string) => {
      if (!approvalId || typeof chat.addToolApprovalResponse !== "function") {
        setChatError({
          code: "approval_unavailable",
          message:
            "This approval request cannot be resumed. Please retry the request.",
        })
        return
      }
      setChatError(null)
      try {
        await chat.addToolApprovalResponse({ id: approvalId, approved: false })
      } catch (err: any) {
        setChatError({
          code: "approval_failed",
          message: err?.message || "Failed to reject agent action",
        })
      }
    },
    [chat]
  )

  const retryLastPrompt = useCallback(async () => {
    if (!lastPrompt) return
    setChatError(null)
    try {
      await chat.sendMessage(lastPrompt)
    } catch (err: any) {
      setChatError({
        code: "retry_failed",
        message: err?.message || "Failed to retry prompt",
      })
    }
  }, [chat, lastPrompt])

  const clearError = useCallback(() => {
    setChatError(null)
  }, [])

  const loadThread = useCallback(
    async (id: string) => {
      if (threadIdRef.current === id && chat.messages.length > 0) {
        // Already loaded or actively streaming in memory
        return
      }

      setIsHydrating(true)
      setThreadId(id)
      threadIdRef.current = id
      setChatError(null)

      try {
        const res = await fetch(
          `${AUTH_SERVER_URL}/api/agent/conversations/${id}`,
          { credentials: "include" }
        )
        if (!res.ok) {
          throw new Error(`Failed to load conversation (${res.status})`)
        }
        const data = await res.json()
        setActiveTitle(data.conversation?.title || "Conversation")
        if (Array.isArray(data.messages)) {
          const formatted = data.messages.map((m: any) => {
            let parts = m.parts
            if (
              Array.isArray(parts) &&
              parts.length === 1 &&
              parts[0]?.role &&
              Array.isArray(parts[0]?.parts)
            ) {
              parts = parts[0].parts
            }
            parts = Array.isArray(parts)
              ? parts.filter((p: any) => p && typeof p === "object")
              : []
            const text = Array.isArray(parts)
              ? parts
                  .filter((p: any) => p?.type === "text")
                  .map((p: any) => p.text ?? p.content ?? "")
                  .join("")
              : typeof m.content === "string"
                ? m.content
                : ""
            const normalizedParts = Array.isArray(parts)
              ? parts.map((p: any) => {
                  if (p?.type === "text") {
                    const t = p.text ?? p.content ?? ""
                    return { ...p, text: t, content: t }
                  }
                  if (p?.type === "thinking") {
                    const t = p.thinking ?? p.content ?? ""
                    return { ...p, thinking: t, content: t }
                  }
                  if (
                    p?.type === "tool-call" ||
                    p?.type === "tool_call" ||
                    p?.type === "tool-invocation" ||
                    p?.type === "tool"
                  ) {
                    const id = String(p.id ?? p.toolCallId ?? "tool")
                    const name = String(p.name ?? p.toolName ?? "unknown_tool")
                    const argsObj =
                      typeof p.args === "object" && p.args !== null
                        ? p.args
                        : typeof p.arguments === "string"
                          ? (() => {
                              try {
                                return JSON.parse(p.arguments)
                              } catch {
                                return {}
                              }
                            })()
                          : {}
                    const argsStr =
                      typeof p.arguments === "string"
                        ? p.arguments
                        : JSON.stringify(argsObj)
                    return {
                      ...p,
                      type: "tool-call",
                      id,
                      toolCallId: id,
                      name,
                      toolName: name,
                      arguments: argsStr,
                      args: argsObj,
                      state: p.state || "input-complete",
                    }
                  }
                  if (p?.type === "tool-result" || p?.type === "tool_result") {
                    const toolCallId = String(p.toolCallId ?? p.id ?? "tool")
                    const contentStr =
                      typeof p.content === "string"
                        ? p.content
                        : JSON.stringify(p.result ?? p.output ?? {})
                    return {
                      ...p,
                      type: "tool-result",
                      id: toolCallId,
                      toolCallId,
                      content: contentStr,
                      result: p.result ?? p.output ?? {},
                      output: p.result ?? p.output ?? {},
                      state: p.state || "complete",
                    }
                  }
                  return p
                })
              : text
                ? [{ type: "text", text, content: text }]
                : []
            return {
              id: m.id,
              role: m.role,
              content: text || null,
              parts: normalizedParts,
            }
          })
          chat.setMessages(formatted)
        }
      } catch (err: any) {
        setChatError({
          code: "load_failed",
          message: err?.message || "Could not load past conversation",
        })
      } finally {
        setIsHydrating(false)
      }
    },
    [chat]
  )

  const resetNewChat = useCallback(() => {
    if (chat.isLoading) return
    if (!threadIdRef.current && chat.messages.length === 0) return

    setThreadId(undefined)
    threadIdRef.current = undefined
    setActiveTitle(undefined)
    setChatError(null)
    chat.clear()
  }, [chat])

  const isCurrentThread = useCallback((id: string) => {
    return threadIdRef.current === id
  }, [])

  return (
    <CommandChatContext.Provider
      value={{
        messages: chat.messages,
        isLoading: chat.isLoading,
        isHydrating,
        threadId,
        activeTitle:
          activeTitle ||
          (chat.messages.length > 0 ? "Conversation" : "New Conversation"),
        selectedModel,
        setSelectedModel,
        chatError,
        sendPrompt,
        stop: chat.stop,
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
