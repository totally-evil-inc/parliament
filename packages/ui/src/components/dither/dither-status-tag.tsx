import type React from "react"
import { cn } from "../../lib/utils"
import { Orb, type OrbVariant } from "../orb"
import type { PixelColor } from "./pixel"

export type DitherStatusTagProps = {
  /** Live status / reasoning text displayed in the tag. */
  status: string
  /** Optional accent color override for custom highlight. */
  color?: PixelColor
  /** Whether the indicator should animate to signal active reasoning. */
  live?: boolean
  /** Orb variant for the reasoning indicator. Defaults to "S1" (Thinking). */
  orbVariant?: OrbVariant
  /** Optional custom icon replacing the Orb indicator. */
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function DitherStatusTag({
  status,
  color,
  live = false,
  orbVariant = "S1",
  icon,
  className,
  onClick,
}: DitherStatusTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative isolate inline-flex w-full cursor-default items-start gap-2.5 rounded-md px-1 py-0.5 text-left focus-visible:outline-none",
        className
      )}
      style={
        color
          ? { color: typeof color === "string" ? color : undefined }
          : undefined
      }
    >
      {/* Live Reasoning Orb Indicator */}
      <span
        className="relative z-10 flex size-4 shrink-0 items-center justify-center pt-0.5 text-foreground/80 dark:text-foreground/90"
        aria-hidden
      >
        {icon ?? (
          <Orb
            variant={orbVariant}
            size={14}
            className={cn(
              "transition-opacity duration-200",
              live ? "opacity-100" : "opacity-40"
            )}
          />
        )}
      </span>

      {/* Status / Thinking Text */}
      <span className="relative z-10 line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap break-words font-normal font-sans text-foreground/85 text-xs leading-relaxed antialiased selection:bg-primary/20">
        {status}
      </span>
    </button>
  )
}
