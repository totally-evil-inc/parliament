import * as React from "react"
import { useIsomorphicLayoutEffect } from "@workspace/ui/hooks/use-isomorphic-layout-effect"
import { cn } from "@workspace/ui/lib/utils"
import {
  isCanvasNumberDraft,
  normalizeCanvasNumberDraft,
  parseCanvasNumberDraft,
} from "./canvas-number"

const canvasFieldClassName = [
  "w-full min-w-0 appearance-none rounded-none border-0 border-b border-transparent",
  "bg-transparent p-0 text-[var(--document-foreground)] shadow-none outline-none dark:bg-transparent",
  "placeholder:text-[color-mix(in_oklab,var(--document-muted-foreground)_58%,transparent)]",
  "transition-[border-color,color,background-color] duration-150",
  "hover:border-[color-mix(in_oklab,var(--document-border)_72%,transparent)]",
  "focus:border-[var(--document-accent)] focus:bg-[color-mix(in_oklab,var(--document-accent)_2.5%,transparent)]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ")

export function CanvasTextField({
  className,
  onValueChange,
  value,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  onValueChange: (value: string) => void
  value: string
}) {
  return (
    <input
      {...props}
      autoComplete={props.autoComplete ?? "off"}
      value={value}
      className={cn(canvasFieldClassName, "h-6 text-sm leading-6", className)}
      onChange={(event) => onValueChange(event.target.value)}
    />
  )
}

export function CanvasTextArea({
  className,
  maxRows,
  minRows = 1,
  onValueChange,
  value,
  ...props
}: Omit<React.ComponentProps<"textarea">, "onChange" | "rows" | "value"> & {
  maxRows?: number
  minRows?: number
  onValueChange: (value: string) => void
  value: string
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  const resize = React.useCallback(() => {
    const element = ref.current
    if (!element) return
    element.style.height = "auto"
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
    const resolvedLineHeight = Number.isFinite(lineHeight) ? lineHeight : 24
    const minimum = resolvedLineHeight * minRows
    const maximum = maxRows
      ? resolvedLineHeight * maxRows
      : Number.POSITIVE_INFINITY
    const height = Math.min(Math.max(element.scrollHeight, minimum), maximum)
    element.style.height = `${height}px`
    element.style.overflowY = element.scrollHeight > maximum ? "auto" : "hidden"
  }, [maxRows, minRows])

  useIsomorphicLayoutEffect(resize, [resize, value])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      className={cn(
        canvasFieldClassName,
        "block resize-none overflow-hidden text-sm leading-6",
        className
      )}
      onChange={(event) => onValueChange(event.target.value)}
      onInput={resize}
    />
  )
}

export function CanvasNumberField({
  className,
  onValueChange,
  value,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "type" | "value"> & {
  onValueChange: (value: number) => void
  value: number
}) {
  const [editState, setEditState] = React.useState(() => ({
    committedValue: value,
    draft: String(value),
  }))

  if (value !== editState.committedValue) {
    setEditState({ committedValue: value, draft: String(value) })
  }

  return (
    <input
      {...props}
      type="text"
      autoComplete={props.autoComplete ?? "off"}
      inputMode="decimal"
      value={editState.draft}
      className={cn(
        canvasFieldClassName,
        "h-6 text-sm leading-6 tabular-nums",
        className
      )}
      onChange={(event) => {
        const next = event.target.value
        if (!isCanvasNumberDraft(next)) return
        const parsed = parseCanvasNumberDraft(next)
        setEditState({ committedValue: parsed, draft: next })
        onValueChange(parsed)
      }}
      onBlur={(event) => {
        const normalized = normalizeCanvasNumberDraft(event.target.value)
        const parsed = parseCanvasNumberDraft(normalized)
        setEditState({ committedValue: parsed, draft: normalized })
        onValueChange(parsed)
        props.onBlur?.(event)
      }}
    />
  )
}
