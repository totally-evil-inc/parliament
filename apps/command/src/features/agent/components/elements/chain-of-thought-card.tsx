import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtImage,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@workspace/ui/components/chain-of-thought"
import type React from "react"

export interface ChainOfThoughtStepItem {
  id?: string
  label: string
  description?: string
  status?: "complete" | "active" | "pending"
  searchResults?: string[]
  image?: { src: string; caption?: string; alt?: string }
}

export interface ChainOfThoughtCardProps {
  steps?: ChainOfThoughtStepItem[]
  title?: string
  defaultOpen?: boolean
  className?: string
}

export const ChainOfThoughtCard: React.FC<ChainOfThoughtCardProps> = ({
  steps,
  title = "Chain of Thought",
  defaultOpen = false,
  className,
}) => {
  if (!steps || steps.length === 0) return null

  return (
    <ChainOfThought defaultOpen={defaultOpen} className={className}>
      <ChainOfThoughtHeader>{title}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step, idx) => (
          <ChainOfThoughtStep
            key={step.id || idx}
            label={step.label}
            description={step.description}
            status={step.status || "complete"}
            isLast={idx === steps.length - 1}
          >
            {step.searchResults && step.searchResults.length > 0 && (
              <ChainOfThoughtSearchResults>
                {step.searchResults.map((result) => (
                  <ChainOfThoughtSearchResult key={result}>
                    {result}
                  </ChainOfThoughtSearchResult>
                ))}
              </ChainOfThoughtSearchResults>
            )}
            {step.image && (
              <ChainOfThoughtImage
                src={step.image.src}
                caption={step.image.caption}
                alt={step.image.alt}
              />
            )}
          </ChainOfThoughtStep>
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
