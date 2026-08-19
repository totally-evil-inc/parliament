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

  const extracted = extractThinkingAndContent(message)
  let extractedContent = extracted.content
  const extractedThinking = extracted.thinking

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

  const thinkingText = message.thinking || extractedThinking || ""

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

  return (
    <div className="my-4 flex max-w-full flex-col space-y-2.5">
      {/* Agent Avatar & Name */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-[10px] text-primary">
          P
        </div>
        <span className="font-semibold text-foreground text-xs">
          Parliament Agent
        </span>
        {isStreaming ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        ) : null}
      </div>

      {/* 1. Reasoning / Thinking Element */}
      <ReasoningCard thinking={thinkingText} isStreaming={isStreaming} />

      {/* 2. Chain of Thought Steps Element */}
      {message.chainOfThought && message.chainOfThought.length > 0 ? (
        <ChainOfThoughtCard steps={message.chainOfThought} />
      ) : null}

      {/* 3. Task Workflow Progress Element */}
      {message.tasks && message.tasks.length > 0
        ? message.tasks.map((task, idx) => (
            <TaskCard
              key={`${task.title}-${idx}`}
              title={task.title}
              status={task.status}
              items={task.items}
            />
          ))
        : null}

      {/* 4. Tool Calls & Approval Element */}
      <ToolCallCard
        toolCalls={message.toolCalls}
        onApproveTool={onApproveTool}
        onRejectTool={onRejectTool}
      />

      {/* 5. Text Message Content */}
      {extractedContent ? <ChatMarkdown content={extractedContent} /> : null}

      {/* 6. OpenUI Generative Spec Element */}
      {message.openuiCode ? (
        <OpenUIMessage content={message.openuiCode} isStreaming={isStreaming} />
      ) : null}

      {/* 7. Inline Error Banner & Retry Element */}
      {message.error ? (
        <MessageErrorCard error={message.error} onRetry={onRetry} />
      ) : null}
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)
MessageBubble.displayName = "MessageBubble"
