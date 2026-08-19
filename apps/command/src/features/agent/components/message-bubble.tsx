import type { TaskStatus } from "@workspace/ui/components/task"
import type React from "react"
import { memo } from "react"
import { ChatMarkdown } from "./chat-markdown"
import { extractThinkingAndContent } from "./command-center-page"
import {
  ChainOfThoughtCard,
  type ChainOfThoughtStepItem,
  MessageErrorCard,
  ReasoningCard,
  TaskCard,
  type TaskItemData,
  ToolCallCard,
  type ToolCallItem,
} from "./elements"
import { OpenUIMessage } from "./openui-message"

export interface MessageBubbleProps {
  message: {
    id?: string
    role: "user" | "assistant" | "system"
    content?: string | unknown
    thinking?: string
    toolCalls?: ToolCallItem[]
    chainOfThought?: ChainOfThoughtStepItem[]
    tasks?: Array<{
      title: string
      status?: TaskStatus
      items?: TaskItemData[]
    }>
    openuiCode?: string
    error?:
      | {
          code?: string
          message?: string
        }
      | string
  }
  isStreaming?: boolean
  onApproveTool?: (toolCallId: string, args: Record<string, unknown>) => void
  onRejectTool?: (toolCallId: string) => void
  onRetry?: () => void
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onApproveTool,
  onRejectTool,
  onRetry,
}) => {
  const isUser = message.role === "user"

  // Fast path: read pre-normalized text & thinking directly, fallback only if completely unparsed
  let extractedContent =
    typeof message.content === "string" ? message.content : ""
  let thinkingText = message.thinking || ""

  if (
    message.content === undefined &&
    message.thinking === undefined &&
    !message.toolCalls &&
    !message.tasks
  ) {
    const extracted = extractThinkingAndContent(message)
    extractedContent = extracted.content
    thinkingText = extracted.thinking || ""
  }

  if (isUser && !extractedContent) {
    const rawMsg = message as Record<string, unknown>
    if (typeof rawMsg.text === "string" && rawMsg.text.trim()) {
      extractedContent = rawMsg.text.trim()
    } else if (Array.isArray(rawMsg.parts)) {
      extractedContent = (rawMsg.parts as Array<unknown>)
        .map((p) => {
          if (typeof p === "string") return p
          if (p && typeof p === "object") {
            const pObj = p as Record<string, unknown>
            if (typeof pObj.text === "string") return pObj.text
            if (typeof pObj.content === "string") return pObj.content
          }
          return ""
        })
        .join("")
        .trim()
    }
  }

  if (isUser) {
    return (
      <div className="my-3 flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-xs">
          <ChatMarkdown
            content={extractedContent || "Message"}
            className="text-primary-foreground [&_*]:text-primary-foreground"
          />
        </div>
      </div>
    )
  }

  const hasActivity = Boolean(
    thinkingText ||
      isStreaming ||
      (message.chainOfThought && message.chainOfThought.length > 0) ||
      (message.tasks && message.tasks.length > 0) ||
      (message.toolCalls && message.toolCalls.length > 0)
  )

  return (
    <div className="my-4 flex max-w-full flex-col space-y-2.5">
      {/* Agent Avatar & Name Header */}
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-[10px] text-primary">
          P
        </div>
        <span className="font-semibold text-foreground text-xs">
          Parliament Agent
        </span>
        {isStreaming ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        ) : null}
      </div>

      {/* Unified Compact Activity Rail */}
      {hasActivity && (
        <section
          aria-label="Assistant Activity Rail"
          className="flex flex-col space-y-1.5"
        >
          {/* 1. Reasoning / Thinking Element */}
          <ReasoningCard thinking={thinkingText} isStreaming={isStreaming} />

          {/* 2. Chain of Thought Steps Element */}
          {message.chainOfThought && message.chainOfThought.length > 0 ? (
            <ChainOfThoughtCard steps={message.chainOfThought} />
          ) : null}

          {/* 3. Task Workflow Progress Element */}
          {message.tasks && message.tasks.length > 0
            ? message.tasks.map((task) => (
                <TaskCard
                  key={task.title}
                  title={task.title}
                  status={task.status}
                  items={task.items}
                />
              ))
            : null}

          {/* 4. Tool Calls & Decision Approvals */}
          <ToolCallCard
            toolCalls={message.toolCalls}
            onApproveTool={onApproveTool}
            onRejectTool={onRejectTool}
          />
        </section>
      )}

      {/* Primary Answer Content */}
      {extractedContent ? <ChatMarkdown content={extractedContent} /> : null}

      {/* OpenUI Generative Spec Element */}
      {message.openuiCode ? (
        <OpenUIMessage content={message.openuiCode} isStreaming={isStreaming} />
      ) : null}

      {/* Inline Error Banner & Retry Element */}
      {message.error ? (
        <MessageErrorCard error={message.error} onRetry={onRetry} />
      ) : null}
    </div>
  )
}

export const MessageBubble = memo(
  MessageBubbleComponent,
  (prevProps, nextProps) => {
    if (prevProps.isStreaming !== nextProps.isStreaming) return false
    if (prevProps.onRetry !== nextProps.onRetry) return false
    if (
      prevProps.onApproveTool !== nextProps.onApproveTool ||
      prevProps.onRejectTool !== nextProps.onRejectTool
    ) {
      return false
    }

    const p = prevProps.message
    const n = nextProps.message
    if (p === n) return true
    if (!p || !n) return false

    // Fast-check error state
    const prevErrMsg =
      typeof p.error === "string"
        ? p.error
        : p.error?.message || p.error?.code || ""
    const nextErrMsg =
      typeof n.error === "string"
        ? n.error
        : n.error?.message || n.error?.code || ""
    if (prevErrMsg !== nextErrMsg) return false

    return (
      p.id === n.id &&
      p.role === n.role &&
      p.content === n.content &&
      p.thinking === n.thinking &&
      p.openuiCode === n.openuiCode &&
      p.toolCalls === n.toolCalls &&
      p.chainOfThought === n.chainOfThought &&
      p.tasks === n.tasks
    )
  }
)
MessageBubble.displayName = "MessageBubble"
