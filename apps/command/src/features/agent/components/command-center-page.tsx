import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  ArrowDownIcon,
  BookmarkIcon,
  BuildingLibraryIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useCommandChatContext } from "../context/command-chat-context"
import { normalizeAssistantMessage } from "../normalization"
import { ChatInput } from "./chat-input"
import { MessageErrorCard, type ToolCallItem } from "./elements"
import { HistoryPanel } from "./history-panel"
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
    const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/)
    if (thinkMatch) {
      thinkingParts.push(thinkMatch[1].trim())
      rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
    } else {
      const openThinkMatch = rawContent.match(/<think>([\s\S]*)$/)
      if (openThinkMatch) {
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
          status:
            part.state === "output-available" ||
            part.output !== undefined ||
            part.result !== undefined
              ? "completed"
              : part.state === "output-error"
                ? "error"
                : "running",
        }))
    : []

  const openuiParts: string[] = []
  rawContent = rawContent.replace(
    /```openui\s*([\s\S]*?)(?:```|$)/gi,
    (_match, code: string) => {
      if (code.trim()) openuiParts.push(code.trim())
      return ""
    }
  )

  const thinking = thinkingParts
    .filter((t): t is string => typeof t === "string" && Boolean(t))
    .join("\n\n")
    .trim()
  return {
    content: rawContent.trim(),
    thinking: thinking.length > 0 ? thinking : undefined,
    openuiCode: openuiParts.length > 0 ? openuiParts.join("\n") : undefined,
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

  const displayedMessages = messages

  const [historyOpen, setHistoryOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const lastMessageCountRef = useRef(messages.length)

  const scrollToBottom = (smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      })
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight
    const atBottom = distanceToBottom < 120
    isAtBottomRef.current = atBottom
    setShowScrollBottom(!atBottom)
  }

  useEffect(() => {
    const isNewUserMessage =
      messages.length > lastMessageCountRef.current &&
      messages[messages.length - 1]?.role === "user"
    lastMessageCountRef.current = messages.length

    if (isNewUserMessage) {
      isAtBottomRef.current = true
      scrollToBottom(true)
    } else if (isAtBottomRef.current) {
      scrollToBottom(false)
    }
  }, [messages, scrollToBottom])

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-border border-b bg-card/50 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3 truncate pr-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
            <BuildingLibraryIcon className="size-4 text-primary" />
          </div>
          <div className="truncate">
            <h1 className="truncate font-semibold text-foreground text-sm">
              {activeTitle || "Parliament Command Agent"}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {threadId
                ? "Active Conversation"
                : "Autonomous sales & proposal operations center"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {threadId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="flex h-8 items-center gap-1.5 px-2.5 text-xs"
              title="Start a new conversation"
            >
              <SparklesIcon className="size-3.5" />
              <span>New Chat</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="flex h-8 items-center gap-1.5 px-3 text-xs"
          >
            <BookmarkIcon className="size-3.5" />
            <span>History</span>
          </Button>
        </div>
      </header>

      {/* Message Feed with ScrollArea */}
      <ScrollArea className="min-h-0 w-full flex-1" onScroll={handleScroll}>
        <main className="mx-auto w-full max-w-4xl space-y-4 px-6 py-4">
          {isHydrating && messages.length === 0 ? (
            <div className="my-24 flex h-full flex-col items-center justify-center space-y-2 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground text-xs">
                Loading conversation history...
              </p>
            </div>
          ) : messages.length === 0 && !chatError ? (
            <div className="my-16 flex h-full flex-col items-center justify-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-3xl">
                <BuildingLibraryIcon className="size-8 text-primary" />
              </div>
              <div className="max-w-md space-y-1">
                <h2 className="font-semibold text-foreground text-lg">
                  Welcome to Parliament Command
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Ask about deals, proposals, invoices, customer analytics, or
                  instruct the agent to dispatch proposals via Gmail and
                  schedule calendar syncs.
                </p>
              </div>
            </div>
          ) : (
            <>
              {displayedMessages.map((m: any, idx: number) => {
                const normalized = normalizeAssistantMessage(m)
                const isLastMessage = idx === displayedMessages.length - 1
                return (
                  <MessageBubble
                    key={m.id || idx}
                    message={{
                      id: m.id,
                      role:
                        (m.role as "user" | "assistant" | "system") ||
                        "assistant",
                      content: normalized.text,
                      thinking: normalized.thinking || undefined,
                      toolCalls: normalized.tools,
                      chainOfThought: normalized.chainOfThought,
                      tasks: normalized.tasks,
                      openuiCode: normalized.openui?.source,
                      error: isLastMessage && chatError ? chatError : undefined,
                    }}
                    onApproveTool={approveTool}
                    onRejectTool={rejectTool}
                    isStreaming={
                      isLoading && isLastMessage && m.role === "assistant"
                    }
                    onRetry={retryLastPrompt}
                  />
                )
              })}


              {/* Feed-level Error Banner when no assistant message was generated */}
              {chatError &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="my-3">
                    <MessageErrorCard
                      error={chatError}
                      onRetry={retryLastPrompt}
                    />
                  </div>
                )}

              {/* Empty Feed Error Banner */}
              {chatError && messages.length === 0 && (
                <div className="mx-auto my-6 max-w-2xl">
                  <MessageErrorCard
                    error={chatError}
                    onRetry={retryLastPrompt}
                  />
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </main>
      </ScrollArea>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <div className="absolute right-8 bottom-24 z-20">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              isAtBottomRef.current = true
              scrollToBottom(true)
            }}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-foreground text-xs shadow-lg backdrop-blur-xs hover:bg-card"
          >
            <ArrowDownIcon className="size-3.5" />
            <span>Jump to latest</span>
          </Button>
        </div>
      )}

      {/* Input */}
      <footer className="shrink-0 border-border border-t bg-background p-4">
        <ChatInput
          onSend={sendPrompt}
          onStop={stop}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      </footer>

      {/* History Slide-over */}
      {historyOpen && (
        <HistoryPanel
          currentThreadId={threadId}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}
