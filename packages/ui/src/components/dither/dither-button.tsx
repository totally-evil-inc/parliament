import { type ComponentProps, useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { rgb } from "./palette"
import {
  BAYER4,
  clamp01,
  fillOf,
  type PixelBloom,
  type PixelColor,
  pixelBloomStyle,
  pixelPrefersReducedMotion,
} from "./pixel"

const CELL = 2

export type ButtonVariant = "gradient" | "dotted" | "hatched" | "solid"

export type DitherButtonProps = ComponentProps<"button"> & {
  /** Fill color — palette name, RGB tuple, or hue. */
  color?: PixelColor
  /** Fill texture pattern. */
  variant?: ButtonVariant
  /** Glow intensity. */
  bloom?: PixelBloom
}

type PaintState = {
  fill: [number, number, number]
  variant: ButtonVariant
}

function paintButton(
  ctx: CanvasRenderingContext2D,
  bloomCtx: CanvasRenderingContext2D | null,
  cols: number,
  rows: number,
  { fill, variant }: PaintState,
  intensity: number
): void {
  ctx.clearRect(0, 0, cols, rows)
  const bias = variant === "dotted" ? 0.12 : 0
  for (let y = 0; y < rows; y++) {
    const density =
      variant === "gradient"
        ? 0.25 + 0.75 * ((y + 0.5) / rows)
        : variant === "dotted"
          ? 0.5
          : 0.75
    for (let x = 0; x < cols; x++) {
      if (variant === "hatched" && ((x + y) & 3) >= 2) continue
      const lit =
        variant === "solid" ||
        density > BAYER4[y & 3][x & 3] - 0.1 * intensity - bias
      if (variant === "dotted" && !lit) continue
      const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
      ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.35))
      ctx.fillRect(x, y, 1, 1)
    }
  }

  // Outline border with intensity brightening
  ctx.fillStyle = rgb(fill, 1, clamp01(0.45 + 0.3 * intensity))
  ctx.fillRect(0, 0, cols, 1)
  ctx.fillRect(0, rows - 1, cols, 1)
  ctx.fillRect(0, 0, 1, rows)
  ctx.fillRect(cols - 1, 0, 1, rows)

  if (bloomCtx) {
    bloomCtx.clearRect(0, 0, cols, rows)
    bloomCtx.drawImage(ctx.canvas, 0, 0)
  }
}

export function DitherButton({
  color = "blue",
  variant = "gradient",
  bloom = "off",
  className,
  children,
  ...props
}: DitherButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bloomRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!button || !canvas || !ctx) return

    const bloomCanvas = bloomRef.current
    const bloomCtx = bloomCanvas?.getContext("2d") ?? null
    const state: PaintState = { fill: fillOf(color), variant }
    const reduce = pixelPrefersReducedMotion()

    let cols = 0
    let rows = 0
    let intensity = 0
    let target = 0
    let hovered = false
    let raf = 0

    const paint = () => paintButton(ctx, bloomCtx, cols, rows, state, intensity)

    const tick = () => {
      const d = target - intensity
      if (Math.abs(d) < 0.01) {
        intensity = target
        paint()
        raf = 0
        return
      }
      intensity += d * 0.18
      paint()
      raf = requestAnimationFrame(tick)
    }

    const setTarget = (t: number) => {
      target = t
      if (reduce) {
        intensity = t
        paint()
      } else if (!raf) {
        raf = requestAnimationFrame(tick)
      }
    }

    const resize = () => {
      const box = button.getBoundingClientRect()
      cols = Math.max(4, Math.round(box.width / CELL))
      rows = Math.max(4, Math.round(box.height / CELL))
      canvas.width = cols
      canvas.height = rows
      if (bloomCanvas) {
        bloomCanvas.width = cols
        bloomCanvas.height = rows
      }
      paint()
    }
    resize()

    const enter = () => {
      hovered = true
      setTarget(1)
    }
    const leave = () => {
      hovered = false
      setTarget(0)
    }
    const down = () => setTarget(1.5)
    const up = () => setTarget(hovered ? 1 : 0)

    button.addEventListener("pointerenter", enter)
    button.addEventListener("pointerleave", leave)
    button.addEventListener("pointerdown", down)
    button.addEventListener("pointerup", up)
    button.addEventListener("pointercancel", up)

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    ro?.observe(button)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      button.removeEventListener("pointerenter", enter)
      button.removeEventListener("pointerleave", leave)
      button.removeEventListener("pointerdown", down)
      button.removeEventListener("pointerup", up)
      button.removeEventListener("pointercancel", up)
      ro?.disconnect()
    }
  }, [color, variant])

  const bloomStyle = pixelBloomStyle(bloom)

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(
        "relative isolate inline-flex items-center justify-center overflow-hidden rounded-md px-3 py-1.5 font-mono text-foreground text-xs transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full"
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
      <span className="relative z-10 flex items-center gap-1.5">
        {children}
      </span>
    </button>
  )
}
