import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { rgb } from "./palette"
import {
  BAYER4,
  clamp01,
  fillOf,
  isCssColor,
  type PixelBloom,
  type PixelColor,
  pixelBloomStyle,
  pixelPrefersReducedMotion,
  resolveCssFill,
} from "./pixel"

const CELL = 2

/** Resolve a shell color for canvas painting. CSS strings — including
 * `var(--custom-property)` — are resolved against the container's computed
 * styles so the dither follows theme tokens. */
function canvasFill(container: HTMLElement, color: PixelColor) {
  if (!isCssColor(color)) return fillOf(color)
  const css = color.trim()
  if (
    css.startsWith("var(") &&
    css.endsWith(")") &&
    !css.slice(4, -1).includes(",")
  ) {
    const name = css.slice(4, -1).trim()
    const value = getComputedStyle(container).getPropertyValue(name).trim()
    if (value) return resolveCssFill(value)
  }
  return resolveCssFill(css)
}

export type DitherShellProps = React.ComponentProps<"div"> & {
  /** Theme color for dither highlights: palette name, RGB tuple, hue, or a
   * CSS color (e.g. "var(--primary)"). Defaults to the app primary. */
  color?: PixelColor
  /** Glow intensity. */
  bloom?: PixelBloom
  /** Authoritative base intensity (0–1), e.g. driven by run/reasoning state.
   * Pointer hover adds a subtle secondary boost. */
  intensity?: number
}

export function DitherShell({
  color = "var(--primary)",
  bloom = "off",
  intensity = 0,
  className,
  children,
  ref,
  ...props
}: DitherShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bloomRef = useRef<HTMLCanvasElement>(null)

  const startLoopRef = useRef<() => void>(() => {})

  const animRef = useRef({
    baseIntensity: 0,
    targetBaseIntensity: 0,
    hoverIntensity: 0,
    targetHoverIntensity: 0,
    pointerHovered: false,
    pointerX: 0,
    pointerY: 0,
    raf: 0,
  })
  const fillRef = useRef(fillOf(color))

  // Sync run state + accent fill into the animation loop
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    fillRef.current = canvasFill(container, color)
    animRef.current.targetBaseIntensity = clamp01(intensity)
    startLoopRef.current()

    // Re-resolve custom property colors when the theme class on <html> changes
    const themeObserver =
      typeof MutationObserver !== "undefined" && document.documentElement
        ? new MutationObserver(() => {
            fillRef.current = canvasFill(container, color)
          })
        : null
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => themeObserver?.disconnect()
  }, [color, intensity])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const container = containerRef.current
    if (!canvas || !ctx || !container) return

    const bloomCanvas = bloomRef.current
    const bloomCtx = bloomCanvas?.getContext("2d") ?? null

    let cols = 0
    let rows = 0
    const reduceMotion = pixelPrefersReducedMotion()

    const resize = () => {
      const box = container.getBoundingClientRect()
      cols = Math.max(8, Math.round(box.width / CELL))
      rows = Math.max(8, Math.round(box.height / CELL))
      canvas.width = cols
      canvas.height = rows
      if (bloomCanvas) {
        bloomCanvas.width = cols
        bloomCanvas.height = rows
      }
    }

    resize()

    const render = () => {
      ctx.clearRect(0, 0, cols, rows)
      const { hoverIntensity, baseIntensity, pointerX, pointerY } =
        animRef.current
      const fill = fillRef.current
      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")

      // 1. Subtle ambient grain dither on the top header ledge (+ reasoning highlight)
      const headerRows = Math.min(rows, 36)
      const ambientColor = isDark
        ? "rgba(180, 190, 210, 0.12)"
        : "rgba(30, 35, 45, 0.08)"

      for (let gy = 0; gy < headerRows; gy++) {
        const rowRamp = 1 - gy / headerRows
        const ambientDensity = (0.08 + baseIntensity * 0.1) * rowRamp
        for (let gx = 0; gx < cols; gx++) {
          if (ambientDensity > BAYER4[gy & 3][gx & 3]) {
            if (baseIntensity > 0.05 && gy < 4) {
              ctx.fillStyle = rgb(
                fill,
                1,
                clamp01(0.18 * baseIntensity * rowRamp)
              )
            } else {
              ctx.fillStyle = ambientColor
            }
            ctx.fillRect(gx, gy, 1, 1)
          }
        }
      }

      // 2. Interactive Bayer dither particle halo on pointer hover
      // Blob appears only when hovering and disappears when pointer exits
      if (hoverIntensity > 0.005 && !reduceMotion) {
        const radiusX = 75 // wide horizontal halo span
        const radiusY = 32 // vertical halo span
        const cx = Math.round(pointerX / CELL)
        const cy = Math.round(pointerY / CELL)
        const time = performance.now() * 0.001

        const minX = Math.max(0, cx - radiusX)
        const maxX = Math.min(cols, cx + radiusX + 1)
        const minY = Math.max(0, cy - radiusY)
        const maxY = Math.min(rows, cy + radiusY + 1)

        for (let gy = minY; gy < maxY; gy++) {
          for (let gx = minX; gx < maxX; gx++) {
            const dx = gx - cx
            const dy = gy - cy
            const distNorm = Math.sqrt(
              (dx / radiusX) ** 2 + (dy / radiusY) ** 2
            )

            if (distNorm >= 1) continue

            const falloff = 1 - distNorm
            const density = falloff ** 1.5 * hoverIntensity * 0.42
            const bayerThreshold = BAYER4[gy & 3][gx & 3]

            if (density > bayerThreshold) {
              const alpha = clamp01(
                (density / 0.42) ** 1.2 * (isDark ? 0.9 : 0.7) * hoverIntensity
              )
              const sparkle =
                (gx * 5 + gy * 7 + Math.floor(time * 6)) % 7 === 0 &&
                distNorm < 0.35

              if (sparkle) {
                if (isDark) {
                  const sparkleR = Math.round(fill[0] * 0.4 + 220 * 0.6)
                  const sparkleG = Math.round(fill[1] * 0.4 + 230 * 0.6)
                  const sparkleB = Math.round(fill[2] * 0.4 + 245 * 0.6)
                  ctx.fillStyle = `rgba(${sparkleR}, ${sparkleG}, ${sparkleB}, ${clamp01(alpha * 0.95)})`
                } else {
                  const sparkleR = Math.round(fill[0] * 0.6 + 20 * 0.4)
                  const sparkleG = Math.round(fill[1] * 0.6 + 25 * 0.4)
                  const sparkleB = Math.round(fill[2] * 0.6 + 35 * 0.4)
                  ctx.fillStyle = `rgba(${sparkleR}, ${sparkleG}, ${sparkleB}, ${clamp01(alpha * 0.85)})`
                }
              } else {
                ctx.fillStyle = rgb(fill, 1, alpha)
              }
              ctx.fillRect(gx, gy, 1, 1)
            }
          }
        }
      }

      if (bloomCtx) {
        bloomCtx.clearRect(0, 0, cols, rows)
        bloomCtx.drawImage(canvas, 0, 0)
      }

      // Intensity easing & animation frame scheduling
      let needsNextFrame = false

      // Ease hover intensity
      const hoverDiff =
        animRef.current.targetHoverIntensity - animRef.current.hoverIntensity
      if (Math.abs(hoverDiff) > 0.005) {
        animRef.current.hoverIntensity += hoverDiff * 0.18
        needsNextFrame = true
      } else {
        animRef.current.hoverIntensity = animRef.current.targetHoverIntensity
      }

      // Ease base intensity
      const baseDiff =
        animRef.current.targetBaseIntensity - animRef.current.baseIntensity
      if (Math.abs(baseDiff) > 0.005) {
        animRef.current.baseIntensity += baseDiff * 0.16
        needsNextFrame = true
      } else {
        animRef.current.baseIntensity = animRef.current.targetBaseIntensity
      }

      if (
        (animRef.current.pointerHovered &&
          animRef.current.hoverIntensity > 0.01 &&
          !reduceMotion) ||
        (animRef.current.baseIntensity > 0.01 && !reduceMotion) ||
        needsNextFrame
      ) {
        animRef.current.raf = requestAnimationFrame(render)
      } else {
        animRef.current.raf = 0
      }
    }

    const startLoop = () => {
      if (!animRef.current.raf) {
        animRef.current.raf = requestAnimationFrame(render)
      }
    }

    startLoopRef.current = startLoop

    // Draw initial frame and start loop if active
    render()
    if (
      animRef.current.targetBaseIntensity > 0 ||
      animRef.current.targetHoverIntensity > 0
    ) {
      startLoop()
    }

    // Direct pointer tracking on the container
    const handleContainerPointerEnter = (e: PointerEvent) => {
      const box = container.getBoundingClientRect()
      animRef.current.pointerX = e.clientX - box.left
      animRef.current.pointerY = e.clientY - box.top
      animRef.current.pointerHovered = true
      animRef.current.targetHoverIntensity = 1
      startLoop()
    }

    const handleContainerPointerMove = (e: PointerEvent) => {
      const box = container.getBoundingClientRect()
      animRef.current.pointerX = e.clientX - box.left
      animRef.current.pointerY = e.clientY - box.top
      if (!animRef.current.pointerHovered) {
        animRef.current.pointerHovered = true
        animRef.current.targetHoverIntensity = 1
      }
      startLoop()
    }

    const handleContainerPointerLeave = () => {
      animRef.current.pointerHovered = false
      animRef.current.targetHoverIntensity = 0
      startLoop()
    }

    container.addEventListener("pointerenter", handleContainerPointerEnter)
    container.addEventListener("pointermove", handleContainerPointerMove)
    container.addEventListener("pointerleave", handleContainerPointerLeave)

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    ro?.observe(container)

    return () => {
      if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf)
      container.removeEventListener("pointerenter", handleContainerPointerEnter)
      container.removeEventListener("pointermove", handleContainerPointerMove)
      container.removeEventListener("pointerleave", handleContainerPointerLeave)
      ro?.disconnect()
    }
  }, [])

  const bloomStyle = pixelBloomStyle(bloom)

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        if (typeof ref === "function") {
          ref(el)
        } else if (ref && typeof ref === "object") {
          ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = el
        }
      }}
      className={cn(
        "relative isolate overflow-hidden rounded-[22px] border border-border/80 bg-card/90 text-card-foreground shadow-lg backdrop-blur-xs transition-colors dark:border-white/[0.08] dark:bg-[#111215] dark:shadow-2xl",
        className
      )}
      {...props}
    >
      {/* Bounded Dither Canvas Layer (strictly clipped inside outer shell) */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {bloomStyle && (
        <canvas
          ref={bloomRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
          style={bloomStyle}
        />
      )}

      {children}
    </div>
  )
}
