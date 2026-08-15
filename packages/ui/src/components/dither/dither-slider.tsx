import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"
import { rgb } from "./palette"
import {
  BAYER4,
  clamp01,
  fillOf,
  type PixelBloom,
  type PixelColor,
  pixelBloomStyle,
} from "./pixel"

const CELL = 2

export type DitherSliderOption = {
  value: string | number
  label: string
}

export type DitherSliderProps = {
  /** Current selected value or progress (0 to 1). */
  value: number | string
  /** Discrete steps or options if stepped slider. */
  options?: (DitherSliderOption | string)[]
  /** Min value for continuous slider (default 0). */
  min?: number
  /** Max value for continuous slider (default 1). */
  max?: number
  /** Step interval for numeric sliders. */
  step?: number
  /** Callback when value changes. */
  onChange?: (value: string | number) => void
  /** Track fill color. */
  color?: PixelColor
  /** Glow intensity. */
  bloom?: PixelBloom
  label?: string
  className?: string
  disabled?: boolean
}

function paintSlider(
  ctx: CanvasRenderingContext2D,
  bloomCtx: CanvasRenderingContext2D | null,
  cols: number,
  rows: number,
  fraction: number,
  fill: [number, number, number],
  hoverIntensity: number
): void {
  ctx.clearRect(0, 0, cols, rows)
  const activeCols = Math.max(0, Math.round(cols * fraction))

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < activeCols) {
        // Active filled region: dithered gradient from left to right edge
        const t = x / Math.max(1, activeCols)
        const density = 0.35 + 0.65 * (1 - t * 0.5)
        const lit = density > BAYER4[y & 3][x & 3] - 0.15 * hoverIntensity
        const k = (0.4 + density * 0.6) * (1 + 0.25 * hoverIntensity)
        ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.25))
        ctx.fillRect(x, y, 1, 1)
      } else {
        // Inactive region: very faint ambient dither pattern
        const lit = 0.15 > BAYER4[y & 3][x & 3]
        if (lit) {
          ctx.fillStyle = rgb(fill, 1, 0.15)
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  // Soft border outline
  ctx.fillStyle = rgb(fill, 1, clamp01(0.3 + 0.25 * hoverIntensity))
  ctx.fillRect(0, 0, cols, 1)
  ctx.fillRect(0, rows - 1, cols, 1)
  ctx.fillRect(0, 0, 1, rows)
  ctx.fillRect(cols - 1, 0, 1, rows)

  if (bloomCtx) {
    bloomCtx.clearRect(0, 0, cols, rows)
    bloomCtx.drawImage(ctx.canvas, 0, 0)
  }
}

export function DitherSlider({
  value,
  options,
  min = 0,
  max = 1,
  step,
  onChange,
  color = "grey",
  bloom = "low",
  label,
  className,
  disabled = false,
}: DitherSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bloomRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const [hovered, setHovered] = useState(false)

  // Compute normalized fraction [0, 1]
  const normalizedFraction = (() => {
    if (options && options.length > 0) {
      const idx = options.findIndex((opt) =>
        typeof opt === "string" ? opt === value : opt.value === value
      )
      if (idx === -1) return 0.5
      return idx / Math.max(1, options.length - 1)
    }
    const numVal = typeof value === "number" ? value : parseFloat(value) || 0
    return clamp01((numVal - min) / (max - min || 1))
  })()

  // Get display label for current value
  const currentDisplayLabel = (() => {
    if (options && options.length > 0) {
      const found = options.find((opt) =>
        typeof opt === "string" ? opt === value : opt.value === value
      )
      if (typeof found === "string") return found
      if (found) return found.label
    }
    return String(value)
  })()

  const handlePointerUpdate = useCallback(
    (clientX: number) => {
      if (disabled || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const ratio = clamp01((clientX - rect.left) / (rect.width || 1))

      if (options && options.length > 0) {
        const index = Math.round(ratio * (options.length - 1))
        const selected = options[index]
        const val = typeof selected === "string" ? selected : selected.value
        onChange?.(val)
      } else {
        let val = min + ratio * (max - min)
        if (step) {
          val = Math.round(val / step) * step
        }
        onChange?.(val)
      }
    },
    [disabled, options, min, max, step, onChange]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const container = containerRef.current
    if (!canvas || !ctx || !container) return

    const bloomCanvas = bloomRef.current
    const bloomCtx = bloomCanvas?.getContext("2d") ?? null
    const fill = fillOf(color)

    let cols = 0
    let rows = 0
    let animIntensity = hovered ? 1 : 0
    const targetIntensity = hovered ? 1 : 0
    let raf = 0

    const paint = () => {
      paintSlider(
        ctx,
        bloomCtx,
        cols,
        rows,
        normalizedFraction,
        fill,
        animIntensity
      )
    }

    const tick = () => {
      const diff = targetIntensity - animIntensity
      if (Math.abs(diff) < 0.02) {
        animIntensity = targetIntensity
        paint()
        raf = 0
        return
      }
      animIntensity += diff * 0.2
      paint()
      raf = requestAnimationFrame(tick)
    }

    const resize = () => {
      const box = container.getBoundingClientRect()
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

    if (targetIntensity !== animIntensity) {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    ro?.observe(container)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [color, normalizedFraction, hovered])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    isDraggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    handlePointerUpdate(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      handlePointerUpdate(e.clientX)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    }
  }

  const bloomStyle = pixelBloomStyle(bloom)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        {label && (
          <span className="font-mono text-muted-foreground text-xs">
            {label}
          </span>
        )}
        <span className="font-medium font-mono text-foreground text-xs">
          {currentDisplayLabel}
        </span>
      </div>

      <div
        ref={containerRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={typeof value === "number" ? value : undefined}
        aria-valuetext={currentDisplayLabel}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          "relative isolate h-7 w-full cursor-pointer select-none overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
          disabled && "cursor-not-allowed opacity-50"
        )}
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
      </div>
    </div>
  )
}
