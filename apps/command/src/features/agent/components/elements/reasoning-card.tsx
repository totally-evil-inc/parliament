import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
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
      defaultOpen={isStreaming}
      className="my-2"
    >
      <ReasoningTrigger />
      {thinking && <ReasoningContent>{thinking}</ReasoningContent>}
    </Reasoning>
  )
}
