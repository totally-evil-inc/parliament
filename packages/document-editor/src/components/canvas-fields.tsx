import { Placeholder } from "@tiptap/extensions"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useIsomorphicLayoutEffect } from "@workspace/ui/hooks/use-isomorphic-layout-effect"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import {
  isCanvasNumberDraft,
  normalizeCanvasNumberDraft,
  parseCanvasNumberDraft,
} from "./canvas-number"

const canvasFieldClassName = [
  "w-full min-w-0 appearance-none rounded-none border-0 border-b border-transparent",
  "bg-transparent p-0 text-[var(--document-foreground)] shadow-none outline-none dark:bg-transparent",
  "placeholder:text-[color-mix(in_oklab,var(--document-muted-foreground)_58%,transparent)]",
  "transition-[border-color,color] duration-150",
  "focus:border-[var(--document-border)]",
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
  const [isFocused, setIsFocused] = React.useState(false)
  const isPlaceholder = !value && !isFocused

  return (
    <div className="relative w-full">
      <input
        {...props}
        autoComplete={props.autoComplete ?? "off"}
        value={value}
        className={cn(
          canvasFieldClassName,
          "relative z-10 h-6 text-sm leading-6",
          isPlaceholder && "opacity-0",
          className
        )}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => {
          setIsFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          props.onBlur?.(event)
        }}
      />
      {isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="h-4 w-full rounded-sm bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] opacity-50 dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
        </div>
      )}
    </div>
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
  const [isFocused, setIsFocused] = React.useState(false)
  const isPlaceholder = !value && !isFocused

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
    <div className="relative w-full">
      <textarea
        {...props}
        ref={ref}
        rows={minRows}
        value={value}
        className={cn(
          canvasFieldClassName,
          "relative z-10 block resize-none overflow-hidden text-sm leading-6",
          isPlaceholder && "opacity-0",
          className
        )}
        onChange={(event) => onValueChange(event.target.value)}
        onInput={resize}
        onFocus={(event) => {
          setIsFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          props.onBlur?.(event)
        }}
      />
      {isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex items-start pt-1">
          <div className="h-4 w-full rounded-sm bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] opacity-50 dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
        </div>
      )}
    </div>
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
  const [isFocused, setIsFocused] = React.useState(false)

  if (value !== editState.committedValue) {
    setEditState({ committedValue: value, draft: String(value) })
  }

  const isPlaceholder = !value && !isFocused

  return (
    <div className="relative w-full">
      <input
        {...props}
        type="text"
        autoComplete={props.autoComplete ?? "off"}
        inputMode="decimal"
        value={editState.draft}
        className={cn(
          canvasFieldClassName,
          "relative z-10 h-6 text-sm tabular-nums leading-6",
          isPlaceholder && "opacity-0",
          className
        )}
        onChange={(event) => {
          const next = event.target.value
          if (!isCanvasNumberDraft(next)) return
          const parsed = parseCanvasNumberDraft(next)
          setEditState({ committedValue: parsed, draft: next })
          onValueChange(parsed)
        }}
        onFocus={(event) => {
          setIsFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          const normalized = normalizeCanvasNumberDraft(event.target.value)
          const parsed = parseCanvasNumberDraft(normalized)
          setEditState({ committedValue: parsed, draft: normalized })
          onValueChange(parsed)
          props.onBlur?.(event)
        }}
      />
      {isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="h-4 w-full rounded-sm bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] opacity-50 dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
        </div>
      )}
    </div>
  )
}

export function CanvasRichTextArea({
  className,
  placeholder,
  value,
  onValueChange,
}: {
  className?: string
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
}) {
  const [isFocused, setIsFocused] = React.useState(false)
  const isEditorEmpty = !value || value === "<p></p>" || value === ""
  const isPlaceholder = isEditorEmpty && !isFocused

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content: value,
    immediatelyRender: false,
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      setIsFocused(false)
      if (editor) {
        onValueChange(editor.getHTML())
      }
    },
    onUpdate: ({ editor }) => {
      onValueChange(editor.getHTML())
    },
  })

  // Sync value from outside if it changed and editor is not focused
  React.useEffect(() => {
    if (!editor || editor.isFocused) return
    const currentHTML = editor.getHTML()
    if (currentHTML !== value) {
      editor.commands.setContent(value ?? "")
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="relative w-full">
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-6 w-full bg-transparent text-foreground outline-none",
          "typeset relative z-10 max-w-none",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror_p]:m-0",
          "[&_.ProseMirror_p.is-empty::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-empty::before]:text-muted-foreground/60",
          "[&_.ProseMirror_p.is-empty::before]:float-left",
          "[&_.ProseMirror_p.is-empty::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-empty::before]:h-0",
          isPlaceholder && "opacity-0",
          className
        )}
      />
      {isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex items-start pt-1">
          <div className="h-4 w-full rounded-sm bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] opacity-50 dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
        </div>
      )}
    </div>
  )
}
