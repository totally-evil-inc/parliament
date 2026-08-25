import {
  ArrowDownIcon,
  BookmarkIcon,
  BuildingLibraryIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { memo, useCallback, useEffect, useMemo, useRef } from "react"
import { authClient } from "@/lib/auth-client"
import { useCommandChatContext } from "../context/command-chat-context"
import { useHistorySidebar } from "../hooks/use-history-sidebar"
import { useSmartScrollAnchor } from "../hooks/use-smart-scroll-anchor"
import {
  latestAssistantThinking,
  normalizeAssistantMessage,
} from "../normalization"
import { extractOpenUI } from "../openui/parser"
import { ChatInput } from "./chat-input"
import { MessageErrorCard, type ToolCallItem } from "./elements"
import { HistorySidebar } from "./history"
import { MessageBubble } from "./message-bubble"

export interface ExtractedMessage {
  content: string
  thinking?: string
  openuiCode?: string
  toolCalls?: ToolCallItem[]
}

export function extractThinkingAndContent(m: any): ExtractedMessage {
  if (!m) return { content: "" }

  let rawContent = ""
  const thinkingParts: string[] = []

  if (typeof m === "string") {
    rawContent = m
  } else {
    // Check direct fields
    if (typeof m.thinking === "string" && m.thinking.trim()) {
      thinkingParts.push(m.thinking)
    }
    if (typeof m.reasoning === "string" && m.reasoning.trim()) {
      thinkingParts.push(m.reasoning)
    }

    // Check content string
    if (typeof m.content === "string") {
      rawContent = m.content
    } else if (Array.isArray(m.content)) {
      const texts: string[] = []
      for (const part of m.content) {
        if (typeof part === "string") {
          texts.push(part)
        } else if (
          part?.type === "thinking" ||
          part?.type === "reasoning" ||
          part?.type === "think"
        ) {
          const t =
            part.thinking || part.reasoning || part.text || part.content || ""
          if (t) thinkingParts.push(t)
        } else {
          const t = part?.text || part?.content || part?.value || ""
          if (t) texts.push(t)
        }
      }
      rawContent = texts.join("\n")
    }

    // TanStack UIMessage parts are the source of truth for one assistant turn.
    if (Array.isArray(m.parts)) {
      const texts: string[] = []
      for (const part of m.parts) {
        if (typeof part === "string") {
          texts.push(part)
        } else if (part?.type === "thinking" || part?.type === "reasoning") {
          const t =
            part.content || part.thinking || part.reasoning || part.text || ""
          if (t) thinkingParts.push(t)
        } else if (part?.type === "text" || !part?.type) {
          const t = part?.text || part?.content || part?.value || ""
          if (t) texts.push(t)
        }
      }
      if (texts.length > 0 && !rawContent) rawContent = texts.join("\n")
    }

    if (!rawContent && typeof m.text === "string") {
      rawContent = m.text
    }
  }

  // Parse <think>...</think> tags inside rawContent (common in DeepSeek R1 & reasoning models)
  if (rawContent.includes("<think>")) {
    const closedMatches = [
      ...rawContent.matchAll(/<think>([\s\S]*?)<\/think>/g),
    ]
    if (closedMatches.length > 0) {
      for (const m of closedMatches) {
        if (m[1]?.trim()) thinkingParts.push(m[1].trim())
      }
      rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
    } else {
      const openThinkMatch = rawContent.match(/<think>([\s\S]*)$/)
      if (openThinkMatch?.[1]) {
        thinkingParts.push(openThinkMatch[1].trim())
        rawContent = rawContent.replace(/<think>[\s\S]*$/, "").trim()
      }
    }
  }

  const toolCalls: ToolCallItem[] = Array.isArray(m?.parts)
    ? m.parts
        .filter(
          (part: any) =>
            part?.type === "tool-call" || part?.type === "tool-invocation"
        )
        .map((part: any) => ({
          id: String(part.id ?? part.toolCallId ?? "tool"),
          name: String(part.name ?? part.toolName ?? "unknown tool"),
          args: parseToolArguments(part.arguments ?? part.args ?? part.input),
          result: part.output ?? part.result ?? part.resultData,
          needsApproval: Boolean(
            part.needsApproval || part.approval?.needsApproval
          ),
          approvalId: part.approvalId ?? part.approval?.id,
          status:
            part.approval?.approved === true
              ? "approved"
              : part.approval?.approved === false
                ? "rejected"
                : part.needsApproval || part.approval
                  ? "pending_approval"
                  : part.state === "output-available" ||
                      part.output !== undefined ||
                      part.result !== undefined
                    ? "completed"
                    : part.state === "output-error"
                      ? "error"
                      : "running",
        }))
    : []

  const ui = extractOpenUI(rawContent)

  const thinking = thinkingParts
    .filter((t): t is string => typeof t === "string" && Boolean(t))
    .join("\n\n")
    .trim()
  return {
    content: (ui.hasOpenUI ? ui.prose : rawContent).trim(),
    thinking: thinking.length > 0 ? thinking : undefined,
    openuiCode: ui.hasOpenUI ? ui.program : undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  }
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Streaming tool arguments can be incomplete; keep the UI usable.
    }
  }
  return {}
}

export function extractMessageText(m: any): string {
  return extractThinkingAndContent(m).content
}

export function extractUserText(m: any): string {
  if (typeof m?.content === "string" && m.content) return m.content
  if (typeof m?.text === "string" && m.text) return m.text
  if (Array.isArray(m?.parts)) {
    return m.parts
      .map((p: any) => {
        if (typeof p === "string") return p
        if (p && typeof p === "object") {
          return p.text || p.content || ""
        }
        return ""
      })
      .join("")
      .trim()
  }
  if (Array.isArray(m?.content)) {
    return m.content
      .map((p: any) => {
        if (typeof p === "string") return p
        if (p && typeof p === "object") {
          return p.text || p.content || ""
        }
        return ""
      })
      .join("")
      .trim()
  }
  return ""
}

const CommandCenterHeader = memo(function CommandCenterHeader({
  activeTitle,
  threadId,
  isHistoryOpen,
  toggleHistory,
  onNewChat,
}: {
  activeTitle?: string
  threadId?: string
  isHistoryOpen: boolean
  toggleHistory: () => void
  onNewChat: () => void
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-border/60 border-b bg-card/50 px-4 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5 truncate pr-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
          <BuildingLibraryIcon className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0 truncate">
          <h1 className="truncate font-semibold text-foreground text-sm">
            {activeTitle || "Parliament Command Agent"}
          </h1>
        </div>
        {threadId ? (
          <span className="hidden rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
            Active
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {threadId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="flex h-8 items-center gap-1.5 px-2.5 text-xs"
            title="Start a new conversation"
          >
            <SparklesIcon className="size-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        ) : null}
        <Button
          variant={isHistoryOpen ? "secondary" : "outline"}
          size="sm"
          onClick={toggleHistory}
          className="flex h-8 items-center gap-1.5 px-3 text-xs"
          title="Toggle conversation history (Cmd+Shift+H)"
        >
          <BookmarkIcon className="size-3.5" />
          <span>History</span>
        </Button>
      </div>
    </header>
  )
})

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    messages,
    isLoading,
    isHydrating,
    selectedModel,
    setSelectedModel,
    sendPrompt,
    stop,
    threadId,
    activeTitle,
    chatError,
    retryLastPrompt,
    approveTool,
    rejectTool,
  } = useCommandChatContext()

  const session = authClient.useSession()
  const userName = session.data?.user?.name
  const displayName = userName?.trim().split(/\s+/)[0] || userName?.trim() || ""

  const isEmpty = messages.length === 0

  // Pre-normalize messages once into stable items to preserve React.memo and avoid redundant extraction
  const normalizedMessages = useMemo(() => {
    return messages.map((m, idx) => {
      const isLastMessage = idx === messages.length - 1
      const isAssistant = m.role === "assistant"
      const normalized = isAssistant ? normalizeAssistantMessage(m) : null

      return {
        id: m.id || String(idx),
        role: (m.role as "user" | "assistant" | "system") || "assistant",
        content: normalized ? normalized.text : extractUserText(m),
        thinking: normalized
          ? normalized.thinking || undefined
          : m.thinking || undefined,
        toolCalls: normalized ? normalized.tools : m.toolCalls,
        chainOfThought: normalized?.chainOfThought,
        tasks: normalized?.tasks,
        openuiCode: normalized?.openui?.source ?? (m as any).openuiCode,
        error: isLastMessage && chatError ? chatError : m.error,
        isStreaming: isLoading && isLastMessage && isAssistant,
      }
    })
  }, [messages, chatError, isLoading])

  // Live reasoning text from the latest assistant turn — only meaningful
  // while a run is streaming; the reasoning strip collapses on completion.
  const activeThinking = isLoading ? latestAssistantThinking(messages) : ""

  const { isOpen: isHistoryOpen, toggle: toggleHistory } = useHistorySidebar()

  const {
    viewportRef,
    bottomRef,
    showScrollBottom,
    scrollToBottom,
    handleScroll,
  } = useSmartScrollAnchor({
    bottomThreshold: 120,
    triggerDeps: [messages, isLoading],
  })

  const lastMessageCountRef = useRef(messages.length)
  useEffect(() => {
    const isNewUserMessage =
      messages.length > lastMessageCountRef.current &&
      messages[messages.length - 1]?.role === "user"
    lastMessageCountRef.current = messages.length

    if (isNewUserMessage) {
      scrollToBottom(true)
    }
  }, [messages, scrollToBottom])

  const handleNewChat = useCallback(() => {
    navigate({ to: "/" })
  }, [navigate])

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground">
      {/* Floating Nested History Sidebar */}
      <HistorySidebar />

      {/* Main Chat Canvas Area */}
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {/* Contextual App Header on top of Chat Canvas */}
        <CommandCenterHeader
          activeTitle={activeTitle}
          threadId={threadId}
          isHistoryOpen={isHistoryOpen}
          toggleHistory={toggleHistory}
          onNewChat={handleNewChat}
        />

        {isEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
            {isHydrating ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-xs">
                  Loading conversation history...
                </p>
              </div>
            ) : (
              <div className="flex w-full max-w-3xl flex-col items-center space-y-6">
                {/* Welcome Header */}
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-3xl shadow-xs">
                    <BuildingLibraryIcon className="size-7 text-primary" />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h2 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
                      {displayName
                        ? `Welcome, ${displayName}`
                        : "Welcome to Parliament Command"}
                    </h2>
                    <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                      Ask about deals, proposals, invoices, customer analytics,
                      or instruct the agent to dispatch proposals via Gmail and
                      schedule calendar syncs.
                    </p>
                  </div>
                </div>

                {/* Empty Feed Error Banner if error occurred */}
                {chatError ? (
                  <div className="w-full max-w-2xl">
                    <MessageErrorCard
                      error={chatError}
                      onRetry={retryLastPrompt}
                    />
                  </div>
                ) : null}

                {/* Centered Chat Input directly below welcome header */}
                <div className="w-full">
                  <ChatInput
                    onSend={sendPrompt}
                    onStop={stop}
                    isLoading={isLoading}
                    thinking={activeThinking}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    showPrompts={true}
                    autoFocus={true}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            {/* Message Feed with ScrollArea */}
            <ScrollArea
              className="min-h-0 w-full flex-1"
              viewportRef={viewportRef}
              onScroll={handleScroll}
            >
              <main className="mx-auto w-full max-w-4xl space-y-4 px-4 pt-4 pb-48 sm:px-6">
                {normalizedMessages.map((msgItem) => (
                  <MessageBubble
                    key={msgItem.id}
                    message={msgItem}
                    onApproveTool={approveTool}
                    onRejectTool={rejectTool}
                    isStreaming={msgItem.isStreaming}
                    onRetry={retryLastPrompt}
                  />
                ))}

                {/* Immediate active streaming placeholder while waiting for assistant token/turn */}
                {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" ? (
                  <MessageBubble
                    key="streaming-pending-assistant-turn"
                    message={{
                      role: "assistant",
                      content: "",
                      thinking: activeThinking || undefined,
                    }}
                    isStreaming={true}
                  />
                ) : null}

                {/* Feed-level Error Banner when no assistant message was generated */}
                {chatError &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" ? (
                  <div className="my-3">
                    <MessageErrorCard
                      error={chatError}
                      onRetry={retryLastPrompt}
                    />
                  </div>
                ) : null}
                <div ref={bottomRef} className="h-4 shrink-0" />
              </main>
            </ScrollArea>

            {/* Floating Scroll to Bottom Button */}
            {showScrollBottom ? (
              <div className="absolute right-6 bottom-36 z-20 sm:right-8">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => scrollToBottom(true)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-foreground text-xs shadow-lg backdrop-blur-xs hover:bg-card"
                >
                  <ArrowDownIcon className="size-3.5" />
                  <span>Jump to latest</span>
                </Button>
              </div>
            ) : null}

            {/* Floating Canvas Chat Input with Gradient Under-Scroll Mask */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-background via-background/85 to-transparent pt-12 pb-4 sm:pb-6">
              <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
                <div className="pointer-events-auto rounded-2xl shadow-2xl">
                  <ChatInput
                    onSend={sendPrompt}
                    onStop={stop}
                    isLoading={isLoading}
                    thinking={activeThinking}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                    showPrompts={false}
                    autoFocus={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
