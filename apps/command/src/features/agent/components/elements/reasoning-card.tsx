import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/reasoning"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useCallback, useEffect, useRef } from "react"

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
  const viewportRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const rafIdRef = useRef<number | null>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget || e.target
    if (target && "scrollHeight" in target) {
      const el = target as HTMLElement
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      isNearBottomRef.current = distanceToBottom < 30
    }
  }, [])

  // Auto-scroll to bottom of live stream thinking text on streaming updates only when reader is near bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: thinking delta triggers auto-scroll calculation
  useEffect(() => {
    if (isStreaming && isNearBottomRef.current && viewportRef.current) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        if (viewportRef.current && isNearBottomRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight
        }
      })
    }
  }, [isStreaming, thinking])

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

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
            viewportRef={viewportRef}
            onScroll={handleScroll}
            className="max-h-72 w-full break-words p-3.5 font-mono text-muted-foreground text-xs leading-relaxed"
          >
            <div className="select-text whitespace-pre-wrap">{thinking}</div>
          </ScrollArea>
        </ReasoningContent>
      ) : null}
    </Reasoning>
  )
}
