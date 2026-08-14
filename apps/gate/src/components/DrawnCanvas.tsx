import { Button } from "@workspace/ui/components/button"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import type React from "react"
import { useRef, useState } from "react"

export type DrawnCanvasProps = {
  onChange?: (dataUrl: string | undefined) => void
  disabled?: boolean
}

export function DrawnCanvas({ onChange, disabled = false }: DrawnCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const hasDrawnRef = useRef(false)

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
    const scaleX = canvas.width / (rect.width || canvas.width)
    const scaleY = canvas.height / (rect.height || canvas.height)
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    setIsDrawing(true)
    hasDrawnRef.current = true
    setHasDrawn(true)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas && hasDrawnRef.current && onChange) {
      onChange(canvas.toDataURL("image/png"))
    }
  }

  const clearCanvas = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setHasDrawn(false)
    if (onChange) {
      onChange(undefined)
    }
  }

  return (
    <div className="space-y-2" data-testid="drawn-canvas-container">
      <div className="relative overflow-hidden rounded-md border border-input bg-background">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="block h-40 w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            Draw your signature above
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          disabled={disabled || !hasDrawn}
          className="gap-1 text-muted-foreground text-xs"
          data-testid="clear-signature-button"
        >
          <ArrowPathIcon className="h-3 w-3" /> Clear Signature
        </Button>
      </div>
    </div>
  )
}
