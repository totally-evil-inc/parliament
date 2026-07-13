import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

const defaultColorOptions = [
  "#ffffff",
  "#fafafa",
  "#f5f5f5",
  "#efefef",
  "#e8e8e8",
  "#e0e0e0",
  "#d6d6d6",
  "#cccccc",
  "#c4c4c4",
  "#bababa",
  "#b0b0b0",
  "#a6a6a6",
  "#9a9a9a",
  "#8a8a8a",
  "#7a7a7a",
  "#6a6a6a",
  "#5a5a5a",
  "#4a4a4a",
  "#3a3a3a",
  "#2d2d2d",
  "#1a1a1a",
  "#0d0d0d",
  "#050505",
  "#000000",
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
