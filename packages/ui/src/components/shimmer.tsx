import type React from "react"
import { useMemo } from "react"
import { cn } from "../lib/utils"

export type ShimmerProps<T extends React.ElementType = "p"> = {
  as?: T
  children: string
  className?: string
  duration?: number
  spread?: number
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">

export function Shimmer<T extends React.ElementType = "p">({
  as,
  children,
  className,
  duration = 2,
  spread = 2,
  style,
  ...props
}: ShimmerProps<T>) {
  const Component = as || "p"

  const dynamicSpread = useMemo(() => {
    return `${Math.max(children.length * spread, 30)}px`
  }, [children.length, spread])

  const combinedStyle = useMemo(
    () => ({
      "--spread": dynamicSpread,
      "--shimmer-duration": `${duration}s`,
      "--bg":
        "linear-gradient(90deg, transparent calc(50% - var(--spread)), var(--color-background, var(--background, #ffffff)) calc(50%), transparent calc(50% + var(--spread)))",
      backgroundImage:
        "var(--bg), linear-gradient(var(--color-muted-foreground, var(--muted-foreground)), var(--color-muted-foreground, var(--muted-foreground)))",
      backgroundPosition: "100% center",
      ...style,
    }),
    [dynamicSpread, duration, style]
  )

  return (
    <Component
      data-slot="shimmer"
      className={cn(
        "relative inline-block animate-text-shimmer select-none bg-[length:250%_100%,auto] bg-clip-text text-transparent [background-repeat:no-repeat,padding-box]",
        className
      )}
      style={combinedStyle as React.CSSProperties}
      {...props}
    >
      {children}
    </Component>
  )
}
