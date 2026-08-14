import { Shimmer } from "@workspace/ui/components/shimmer"
import type { TaskStatus } from "@workspace/ui/components/task"
import type React from "react"
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  onApproveTool,
  onRejectTool,
  onRetry,
}) => {
  const isUser = message.role === "user"

  let { content: extractedContent, thinking: extractedThinking } =
    typeof message.content === "string" && message.content.trim()
      ? { content: message.content, thinking: message.thinking }
      : extractThinkingAndContent(message)

  if (isUser && !extractedContent) {
    if (
      typeof (message as any).text === "string" &&
      (message as any).text.trim()
    ) {
      extractedContent = (message as any).text.trim()
    } else if (Array.isArray((message as any).parts)) {
      extractedContent = (message as any).parts
        .filter((p: any) => p?.type === "text")
        .map((p: any) => p.text ?? p.content ?? "")
        .join("")
        .trim()
    }
  }

  const thinkingText = message.thinking || extractedThinking

  if (isUser) {
    return (
      <div className="my-3 flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm shadow-xs">
          {extractedContent || "Message"}
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
        {isStreaming && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </div>

      {/* 1. Reasoning / Thinking Element */}
      <ReasoningCard thinking={thinkingText || ""} isStreaming={isStreaming} />

      {/* 2. Chain of Thought Steps Element */}
      {message.chainOfThought && message.chainOfThought.length > 0 && (
        <ChainOfThoughtCard steps={message.chainOfThought} />
      )}

      {/* 3. Task Workflow Progress Element */}
      {message.tasks &&
        message.tasks.map((task, tIdx) => (
          <TaskCard
            key={tIdx}
            title={task.title}
            status={task.status}
            items={task.items}
          />
        ))}

      {/* 4. Tool Calls & Approval Element */}
      <ToolCallCard
        toolCalls={message.toolCalls}
        onApproveTool={onApproveTool}
        onRejectTool={onRejectTool}
      />

      {/* 5. Text Message Content / Waiting indicator */}
      {extractedContent ? (
        <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
          {extractedContent}
        </div>
      ) : isStreaming &&
        !thinkingText &&
        (!message.toolCalls || message.toolCalls.length === 0) &&
        !message.openuiCode ? (
        <div className="flex items-center gap-2 py-1 text-muted-foreground text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <Shimmer duration={1.5} className="font-medium text-xs">
            Thinking & awaiting model response…
          </Shimmer>
        </div>
      ) : null}

      {/* 6. OpenUI Generative Spec Element */}
      {message.openuiCode && (
        <OpenUIMessage content={message.openuiCode} isStreaming={isStreaming} />
      )}

      {/* 7. Inline Error Banner & Retry Element */}
      {message.error && (
        <MessageErrorCard error={message.error} onRetry={onRetry} />
      )}
    </div>
  )
}
