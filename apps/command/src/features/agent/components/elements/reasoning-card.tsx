import {
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { useEffect, useState } from "react"

export interface ReasoningCardProps {
  thinking: string
  isStreaming?: boolean
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({
  thinking,
  isStreaming = false,
}) => {
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setExpanded(isStreaming)
  }, [isStreaming])

  if (!thinking) return null

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-muted/30 text-xs shadow-xs transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <BoltIcon className="size-3.5 shrink-0 text-amber-500" />
          <span className="font-semibold text-foreground/90">
            Agent reasoning
          </span>
          {isStreaming && (
            <span className="ml-1 flex items-center gap-1.5 font-sans text-[10px] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span>working…</span>
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 font-medium text-[10px] text-muted-foreground">
          <span>{expanded ? "Hide" : "Show"}</span>
          {expanded ? (
            <ChevronUpIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="custom-scrollbar max-h-60 overflow-y-auto whitespace-pre-wrap border-border/60 border-t bg-card/40 px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  )
}
