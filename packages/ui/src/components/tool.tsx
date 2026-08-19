import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ExclamationCircleIcon,
  NoSymbolIcon,
  ShieldExclamationIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { createContext, isValidElement, useContext, useState } from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import { ScrollArea } from "./scroll-area"

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied"
  | "completed"
  | "running"
  | "pending"
  | "error"
  | "awaiting-approval"
  | "approved"
  | "rejected"

interface ToolContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ToolContext = createContext<ToolContextValue | null>(null)

export function useTool() {
  const context = useContext(ToolContext)
  if (!context) {
    throw new Error("useTool must be used within a <Tool /> component")
  }
  return context
}

export function getStatusBadge(state: ToolState): React.ReactNode {
  switch (state) {
    case "input-available":
    case "running":
      return (
        <span className="inline-flex items-center gap-1 font-medium text-[10px] text-amber-600 dark:text-amber-400">
          <ArrowPathIcon className="size-3 shrink-0 animate-spin" />
          <span>Running</span>
        </span>
      )
    case "approval-requested":
    case "awaiting-approval":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-[10px] text-amber-700 dark:text-amber-300"
        >
          <ShieldExclamationIcon className="size-3 shrink-0 text-amber-500" />
          <span>Awaiting Approval</span>
        </Badge>
      )
    case "output-error":
    case "error":
      return (
        <Badge
          variant="destructive"
          className="gap-1 rounded-full px-2 py-0.5 font-medium text-[10px]"
        >
          <ExclamationCircleIcon className="size-3 shrink-0" />
          <span>Error</span>
        </Badge>
      )
    case "output-denied":
    case "rejected":
      return (
        <Badge
          variant="secondary"
          className="gap-1 rounded-full border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-[10px] text-destructive"
        >
          <NoSymbolIcon className="size-3 shrink-0" />
          <span>Denied</span>
        </Badge>
      )
    default:
      // No badge for completed/standard states to keep chat sleek and uncluttered
      return null
  }
}

export interface ToolProps extends React.ComponentProps<typeof Collapsible> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function Tool({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ToolProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <ToolContext.Provider
      value={{
        isOpen,
        setIsOpen: handleOpenChange,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn(
          "group not-prose my-1.5 w-full max-w-full overflow-hidden rounded-lg border border-border/40 bg-muted/15 text-xs transition-colors hover:border-border/60 hover:bg-muted/25",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    </ToolContext.Provider>
  )
}

export interface ToolHeaderProps
  extends Omit<React.ComponentProps<typeof CollapsibleTrigger>, "type"> {
  type: string
  state: ToolState
  toolName?: string
  title?: string
}

export function ToolHeader({
  type,
  state,
  toolName,
  title,
  className,
  ...props
}: ToolHeaderProps) {
  const { isOpen } = useTool()

  const displayName =
    title ||
    toolName ||
    type
      .replace(/^tool-/, "")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase())

  const badge = getStatusBadge(state)

  return (
    <CollapsibleTrigger
      data-slot="tool-header"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-2.5 px-2.5 py-1.5 text-left font-mono transition-colors hover:bg-muted/30",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <WrenchScrewdriverIcon className="size-3.5 shrink-0 text-muted-foreground/80" />
        <span className="truncate font-medium text-foreground/80 text-xs">
          {displayName}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <ChevronDownIcon
        className={cn(
          "size-3 shrink-0 text-muted-foreground/70 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )
}

export function ToolContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn(
        "max-w-full space-y-2.5 overflow-hidden border-border/40 border-t bg-muted/10 p-2.5 text-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

export interface ToolInputProps extends React.ComponentPropsWithoutRef<"div"> {
  input: Record<string, unknown> | unknown
}

export function ToolInput({ input, className, ...props }: ToolInputProps) {
  if (
    !input ||
    (typeof input === "object" && Object.keys(input as object).length === 0)
  ) {
    return null
  }

  const jsonString =
    typeof input === "string" ? input : JSON.stringify(input, null, 2)

  return (
    <div
      data-slot="tool-input"
      className={cn("max-w-full space-y-1.5 overflow-hidden", className)}
      {...props}
    >
      <h4 className="font-medium font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
        Parameters
      </h4>
      <ScrollArea
        orientation="both"
        className="max-h-56 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px]"
      >
        <pre className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
          {jsonString}
        </pre>
      </ScrollArea>
    </div>
  )
}

export interface ToolOutputProps extends React.ComponentPropsWithoutRef<"div"> {
  output?: React.ReactNode | unknown
  errorText?: string
}

export function ToolOutput({
  output,
  errorText,
  className,
  children,
  ...props
}: ToolOutputProps) {
  const [copied, setCopied] = useState(false)
  if (!output && !errorText && !children) return null

  const handleCopyError = () => {
    if (!errorText) return
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      data-slot="tool-output"
      className={cn("max-w-full space-y-1.5 overflow-hidden", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
          {errorText ? "Error Output" : "Result"}
        </h4>
        {errorText && (
          <button
            type="button"
            onClick={handleCopyError}
            className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? (
              <>
                <CheckIcon className="size-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="size-3" />
                <span>Copy Error</span>
              </>
            )}
          </button>
        )}
      </div>

      {errorText ? (
        <ScrollArea
          orientation="both"
          className="max-h-64 max-w-full rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 font-mono text-[11px] text-destructive"
        >
          <pre className="whitespace-pre-wrap break-words font-mono leading-relaxed">
            {errorText}
          </pre>
        </ScrollArea>
      ) : output !== undefined ? (
        typeof output === "string" ? (
          <ScrollArea
            orientation="both"
            className="max-h-80 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px] text-foreground/90"
          >
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              {output}
            </pre>
          </ScrollArea>
        ) : typeof output === "object" &&
          output !== null &&
          !isValidElement(output) ? (
          <ScrollArea
            orientation="both"
            className="max-h-80 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-[11px]"
          >
            <pre className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
              {JSON.stringify(output, null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <ScrollArea
            orientation="both"
            className="max-h-80 max-w-full rounded-lg border border-border/80 bg-background/80 p-2.5 text-[11px] text-foreground/90"
          >
            <div className="break-words">
              {output as React.ReactNode}
            </div>
          </ScrollArea>
        )
      ) : (
        children
      )}
    </div>
  )
}
