import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
import { Shimmer } from "@workspace/ui/components/shimmer"
import type React from "react"
import { useEffect, useRef } from "react"

export interface ReasoningCardProps {
  thinking?: string
  isStreaming?: boolean
  duration?: number
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({
  thinking,
  isStreaming = false,
  duration,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [isStreaming])

  if (!thinking && !isStreaming) return null

  return (
    <Reasoning
      isStreaming={isStreaming}
      duration={duration}
      defaultOpen={isStreaming}
      className="my-2"
    >
      <ReasoningTrigger />
      <ReasoningContent
        ref={contentRef}
        className="max-h-96 overflow-y-auto break-words font-mono text-xs leading-relaxed"
      >
        {thinking ? (
          <div className="whitespace-pre-wrap">{thinking}</div>
        ) : (
          <div className="flex items-center gap-2 py-1 text-muted-foreground text-xs italic">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <Shimmer duration={1.5}>
              Analyzing requirements &amp; formulating reasoning…
            </Shimmer>
          </div>
        )}
      </ReasoningContent>
    </Reasoning>
  )
}
