import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
import { Shimmer } from "@workspace/ui/components/shimmer"
import type React from "react"

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
  if (!thinking && !isStreaming) return null

  return (
    <Reasoning
      isStreaming={isStreaming}
      duration={duration}
      defaultOpen={true}
      className="my-2"
    >
      <ReasoningTrigger />
      <ReasoningContent>
        {thinking ? (
          thinking
        ) : isStreaming ? (
          <div className="flex items-center gap-2 py-0.5 text-muted-foreground text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Shimmer duration={1.5} className="text-xs">
              Analyzing requirements and synthesizing reasoning trace…
            </Shimmer>
          </div>
        ) : null}
      </ReasoningContent>
    </Reasoning>
  )
}
