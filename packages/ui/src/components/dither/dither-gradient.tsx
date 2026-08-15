import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { rgb } from "./palette"
import {
  BAYER4,
  fillOf,
  type PixelBloom,
  type PixelColor,
  pixelBloomStyle,
} from "./pixel"

const MAX_COLS = 960
const MAX_ROWS = 600

export type GradientDirection = "up" | "down" | "left" | "right" | "radial"

export type DitherGradientProps = {
  /** The starting solid color — a palette name, RGB tuple, or hue. */
  from: PixelColor
  /** Target dissolution color: another color for two-tone, or "transparent". */
  to?: PixelColor | "transparent"
  /** Gradient direction. */
  direction?: GradientDirection
  /** CSS px per dither cell. */
  cell?: number
  /** Overall opacity. */
  opacity?: number
  /** Glow intensity. */
  bloom?: PixelBloom
  className?: string
  style?: React.CSSProperties
}

type PaintSpec = {
  from: PixelColor
  to: PixelColor | "transparent"
  direction: GradientDirection
  cell: number
  opacity: number
}

function paintGradient(
  canvas: HTMLCanvasElement,
  bloomCanvas: HTMLCanvasElement | null,
  width: number,
  height: number,
  spec: PaintSpec
): void {
  const ctx = canvas.getContext("2d")
  if (!ctx || width <= 0 || height <= 0) return
  const cols = Math.min(MAX_COLS, Math.max(4, Math.round(width / spec.cell)))
  const rows = Math.min(MAX_ROWS, Math.max(4, Math.round(height / spec.cell)))
  canvas.width = cols
  canvas.height = rows

  const fromFill = fillOf(spec.from)
  const toFill = spec.to === "transparent" ? null : fillOf(spec.to)
  const o = spec.opacity

  const cx = cols / 2
  const cy = rows / 2
  const maxRadius = Math.sqrt(cx * cx + cy * cy)

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let t = 0
      if (spec.direction === "up") {
        t = 1 - (y + 0.5) / rows
      } else if (spec.direction === "down") {
        t = (y + 0.5) / rows
      } else if (spec.direction === "left") {
        t = 1 - (x + 0.5) / cols
      } else if (spec.direction === "right") {
        t = (x + 0.5) / cols
      } else if (spec.direction === "radial") {
        const dx = x - cx
        const dy = y - cy
        t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxRadius)
      }

      const density = 1 - t
      const lit = density > BAYER4[y & 3][x & 3]
      if (toFill) {
        ctx.fillStyle = rgb(lit ? fromFill : toFill, 1, o)
        ctx.fillRect(x, y, 1, 1)
      } else {
        const alpha = (lit ? 0.35 + 0.65 * density : 0.12 * density) * o
        if (alpha <= 0.004) continue
        ctx.fillStyle = rgb(fromFill, 1, alpha)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  const bloomCtx = bloomCanvas?.getContext("2d") ?? null
  if (bloomCanvas && bloomCtx) {
    bloomCanvas.width = cols
    bloomCanvas.height = rows
    bloomCtx.drawImage(canvas, 0, 0)
  }
}

export function DitherGradient({
  from,
  to = "transparent",
  direction = "up",
  cell = 3,
  opacity = 1,
  bloom = "off",
  className,
  style,
}: DitherGradientProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bloomRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const paint = () => {
      const box = wrap.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return
      paintGradient(canvas, bloomRef.current, box.width, box.height, {
        from,
        to,
        direction,
        cell,
        opacity,
      })
    }

    paint()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(paint)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [from, to, direction, cell, opacity])

  const bloomStyle = pixelBloomStyle(bloom)

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={style}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {bloomStyle && (
        <canvas
          ref={bloomRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={bloomStyle}
        />
      )}
    </div>
  )
}
