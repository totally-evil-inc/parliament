import { ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline"
import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { cn } from "../lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import { Shimmer } from "./shimmer"

export interface ReasoningContextValue {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration?: number
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

export function useReasoning() {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error(
      "useReasoning must be used within a <Reasoning /> container"
    )
  }
  return context
}

export interface ReasoningProps
  extends React.ComponentProps<typeof Collapsible> {
  isStreaming?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
  className?: string
}

export function Reasoning({
  isStreaming = false,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  duration: controlledDuration,
  className,
  children,
  ...props
}: ReasoningProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const [elapsedSeconds, setElapsedSeconds] = useState<number | undefined>(
    controlledDuration
  )
  const startTimeRef = useRef<number | null>(null)
  const prevStreamingRef = useRef(isStreaming)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  // Auto-open on streaming start; record duration on stream end
  useEffect(() => {
    if (isStreaming && !prevStreamingRef.current) {
      if (!isControlled) setUncontrolledOpen(true)
      onOpenChange?.(true)
      startTimeRef.current = Date.now()
    } else if (!isStreaming && prevStreamingRef.current) {
      if (startTimeRef.current) {
        const finalDuration = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000)
        )
        setElapsedSeconds(finalDuration)
      }
      if (!isControlled) setUncontrolledOpen(false)
      onOpenChange?.(false)
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, isControlled, onOpenChange])

  // Live timer tick during streaming
  useEffect(() => {
    if (!isStreaming) return
    if (!startTimeRef.current) startTimeRef.current = Date.now()

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const currentElapsed = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000)
        )
        setElapsedSeconds(currentElapsed)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isStreaming])

  const effectiveDuration = controlledDuration ?? elapsedSeconds

  return (
    <ReasoningContext.Provider
      value={{
        isStreaming,
        isOpen,
        setIsOpen: handleOpenChange,
        duration: effectiveDuration,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn("not-prose my-2 w-full", className)}
        {...props}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  )
}

export interface ReasoningTriggerProps
  extends React.ComponentProps<typeof CollapsibleTrigger> {
  getThinkingMessage?: (
    isStreaming: boolean,
    duration?: number
  ) => React.ReactNode
}

export function ReasoningTrigger({
  getThinkingMessage,
  className,
  children,
  ...props
}: ReasoningTriggerProps) {
  const { isStreaming, duration, isOpen } = useReasoning()

  const defaultMessage = isStreaming ? (
    <div className="flex items-center gap-1.5 font-medium">
      <Shimmer duration={1.5} className="text-xs">
        Thinking…
      </Shimmer>
    </div>
  ) : duration && duration > 0 ? (
    <span>{`Thought for ${duration}s`}</span>
  ) : (
    <span>Thought for a few seconds</span>
  )

  const message = getThinkingMessage
    ? getThinkingMessage(isStreaming, duration)
    : children || defaultMessage

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      aria-label={
        isStreaming
          ? "Thinking in progress, toggle reasoning details"
          : "Reasoning details"
      }
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/40 px-3.5 py-2 text-left font-mono text-muted-foreground text-xs transition-all hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <SparklesIcon className="size-3.5 shrink-0 text-primary" />
          {isStreaming && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </div>
        <div className="text-xs">{message}</div>
      </div>
      <ChevronDownIcon
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )
}

export interface ReasoningContentProps
  extends React.ComponentProps<typeof CollapsibleContent> {
  children?: React.ReactNode
}

export function ReasoningContent({
  className,
  children,
  ...props
}: ReasoningContentProps) {
  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "mt-2 overflow-hidden rounded-lg border border-border/60 bg-muted/20 p-3.5 font-mono text-muted-foreground text-xs leading-relaxed transition-all",
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <div className="whitespace-pre-wrap">{children}</div>
      ) : (
        children
      )}
    </CollapsibleContent>
  )
}
