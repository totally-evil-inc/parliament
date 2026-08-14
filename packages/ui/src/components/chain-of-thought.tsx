import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline"
import type React from "react"
import { createContext, useContext, useState } from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"

interface ChainOfThoughtContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
)

export function useChainOfThought() {
  const context = useContext(ChainOfThoughtContext)
  if (!context) {
    throw new Error(
      "useChainOfThought must be used within a <ChainOfThought /> component"
    )
  }
  return context
}

export interface ChainOfThoughtProps
  extends React.ComponentProps<typeof Collapsible> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function ChainOfThought({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ChainOfThoughtProps) {
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
    <ChainOfThoughtContext.Provider
      value={{
        isOpen,
        setIsOpen: handleOpenChange,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn("not-prose my-2 w-full space-y-2", className)}
        {...props}
      >
        {children}
      </Collapsible>
    </ChainOfThoughtContext.Provider>
  )
}

export interface ChainOfThoughtHeaderProps
  extends React.ComponentProps<typeof CollapsibleTrigger> {
  children?: React.ReactNode
}

export function ChainOfThoughtHeader({
  className,
  children = "Chain of Thought",
  ...props
}: ChainOfThoughtHeaderProps) {
  const { isOpen } = useChainOfThought()

  return (
    <CollapsibleTrigger
      data-slot="chain-of-thought-header"
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/40 px-3.5 py-2 text-left font-mono text-muted-foreground text-xs transition-all hover:bg-muted/70 hover:text-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-3.5 shrink-0 text-primary" />
        <span className="font-semibold text-foreground text-xs">
          {children}
        </span>
      </div>
      <ChevronDownIcon
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  )
}

export interface ChainOfThoughtContentProps
  extends React.ComponentProps<typeof CollapsibleContent> {
  children?: React.ReactNode
}

export function ChainOfThoughtContent({
  className,
  children,
  ...props
}: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent
      data-slot="chain-of-thought-content"
      className={cn(
        "space-y-3 rounded-lg border border-border/60 bg-card/40 p-4 text-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

export interface ChainOfThoughtStepProps
  extends React.ComponentPropsWithoutRef<"div"> {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode
  label: React.ReactNode
  description?: React.ReactNode
  status?: "complete" | "active" | "pending"
  isLast?: boolean
}

export function ChainOfThoughtStep({
  icon,
  label,
  description,
  status = "complete",
  isLast = false,
  className,
  children,
  ...props
}: ChainOfThoughtStepProps) {
  const renderIcon = () => {
    if (icon) {
      if (typeof icon === "function") {
        const IconComponent = icon
        return <IconComponent className="size-3.5" />
      }
      return icon
    }

    if (status === "complete") {
      return <CheckCircleIcon className="size-3.5 text-emerald-500" />
    }
    if (status === "active") {
      return (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      )
    }
    return <ClockIcon className="size-3.5 text-muted-foreground/60" />
  }

  return (
    <div
      data-slot="chain-of-thought-step"
      className={cn("flex gap-3 text-xs", className)}
      {...props}
    >
      {/* Icon & connecting vertical line */}
      <div className="relative mt-0.5 flex flex-col items-center">
        <div className="flex size-4 items-center justify-center">
          {renderIcon()}
        </div>
        {!isLast && (
          <div className="absolute top-5 bottom-0 left-1/2 -mx-px w-px bg-border/80" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1 pb-3">
        <div
          className={cn(
            "font-medium leading-tight",
            status === "active"
              ? "font-semibold text-foreground"
              : "text-foreground/90"
          )}
        >
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function ChainOfThoughtSearchResults({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="chain-of-thought-search-results"
      className={cn("mt-1.5 flex flex-wrap items-center gap-1.5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function ChainOfThoughtSearchResult({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="secondary"
      data-slot="chain-of-thought-search-result"
      className={cn(
        "rounded-full border border-border/80 px-2 py-0.5 font-normal text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Badge>
  )
}

export interface ChainOfThoughtImageProps
  extends React.ComponentPropsWithoutRef<"div"> {
  caption?: string
  src?: string
  alt?: string
}

export function ChainOfThoughtImage({
  caption,
  src,
  alt = "Chain of thought visual",
  className,
  children,
  ...props
}: ChainOfThoughtImageProps) {
  return (
    <div
      data-slot="chain-of-thought-image"
      className={cn("mt-2 space-y-1.5", className)}
      {...props}
    >
      <div className="relative flex max-h-80 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-muted/30 p-2">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="max-h-72 w-auto max-w-full rounded-md object-contain"
          />
        ) : (
          children
        )}
      </div>
      {caption && (
        <p className="text-center font-mono text-[10px] text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  )
}
