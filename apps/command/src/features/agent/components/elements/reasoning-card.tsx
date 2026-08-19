import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useEffect, useRef } from "react"

export interface ReasoningCardProps {
  thinking?: string
  isStreaming?: boolean
  duration?: number
  defaultOpen?: boolean
  className?: string
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({
  thinking,
  isStreaming = false,
  duration,
  defaultOpen,
  className,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of live stream thinking text
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [isStreaming])

  if (!thinking && !isStreaming) return null

  const computedDefaultOpen =
    defaultOpen !== undefined
      ? defaultOpen
      : isStreaming && Boolean(thinking?.trim())

  return (
    <Reasoning
      isStreaming={isStreaming}
      duration={duration}
      defaultOpen={computedDefaultOpen}
      className={cn("my-1.5", className)}
    >
      <ReasoningTrigger />
      {thinking ? (
        <ReasoningContent className="p-0">
          <ScrollArea
            ref={contentRef}
            className="max-h-72 w-full break-words p-3.5 font-mono text-muted-foreground text-xs leading-relaxed"
          >
            <div className="select-text whitespace-pre-wrap">{thinking}</div>
          </ScrollArea>
        </ReasoningContent>
      ) : null}
    </Reasoning>
  )
}
