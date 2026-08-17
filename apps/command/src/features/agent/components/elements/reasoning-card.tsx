import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
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
      defaultOpen={isStreaming && Boolean(thinking)}
      className="my-2"
    >
      <ReasoningTrigger />
      {thinking ? (
        <ReasoningContent
          ref={contentRef}
          className="max-h-96 overflow-y-auto break-words font-mono text-xs leading-relaxed"
        >
          <div className="whitespace-pre-wrap">{thinking}</div>
        </ReasoningContent>
      ) : null}
    </Reasoning>
  )
}
