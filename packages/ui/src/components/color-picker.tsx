import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

const defaultColorOptions = [
  "#ffffff",
  "#f8fafc",
  "#f4f5f7",
  "#e5e7eb",
  "#d1d5db",
  "#9ca3af",
  "#6b7280",
  "#374151",
  "#1f2937",
  "#111827",
  "#111111",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#e11d48",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#65a30d",
  "#16a34a",
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#2563eb",
  "#4f46e5",
] as const

type ColorPickerProps = {
  value: string
  onValueChange: (value: string) => void
  label?: string
  colors?: ReadonlyArray<string>
  className?: string
}

function ColorPicker({
  value,
  onValueChange,
  label = "Color",
  colors = defaultColorOptions,
  className,
}: ColorPickerProps) {
  const normalizedValue = value.toLowerCase()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("h-8 w-full justify-start gap-2 px-2", className)}
          />
        }
      >
        <span
          aria-hidden="true"
          className="size-4 shrink-0 rounded-sm border border-border"
          style={{ background: value }}
        />
        <span className="min-w-0 truncate font-mono text-[11px] uppercase">
          {value}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="grid grid-cols-8 gap-2">
          {colors.map((color) => {
            const selected = color.toLowerCase() === normalizedValue

            return (
              <button
                key={color}
                type="button"
                aria-label={`${label} ${color}`}
                aria-pressed={selected}
                onClick={() => onValueChange(color)}
                className={cn(
                  "size-6 rounded-sm border border-border ring-offset-background transition-shadow hover:ring-2 hover:ring-ring/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "ring-2 ring-ring"
                )}
                style={{ background: color }}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ColorPicker }
