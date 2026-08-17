import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

export type TimeValue = {
  hours: number // 0-23
  minutes: number // 0-59
}

export type TimePickerProps = {
  value?: TimeValue
  onChange?: (value: TimeValue) => void
  minuteStep?: 1 | 5 | 15 | 30
  use12Hour?: boolean
  className?: string
  disabled?: boolean
}

const DEFAULT_QUICK_PRESETS: Array<{
  label: string
  hours: number
  minutes: number
}> = [
  { label: "09:00 AM", hours: 9, minutes: 0 },
  { label: "12:00 PM", hours: 12, minutes: 0 },
  { label: "02:00 PM", hours: 14, minutes: 0 },
  { label: "05:00 PM", hours: 17, minutes: 0 },
  { label: "08:00 PM", hours: 20, minutes: 0 },
]

export function TimePicker({
  value = { hours: 9, minutes: 0 },
  onChange,
  minuteStep = 5,
  use12Hour = true,
  className,
  disabled = false,
}: TimePickerProps) {
  const currentHours24 = Math.min(Math.max(value?.hours ?? 9, 0), 23)
  const currentMinutes = Math.min(Math.max(value?.minutes ?? 0, 0), 59)

  const isPM = currentHours24 >= 12
  const currentHours12 = currentHours24 % 12 === 0 ? 12 : currentHours24 % 12

  const hoursList = React.useMemo(() => {
    if (use12Hour) {
      return Array.from({ length: 12 }, (_, i) => i + 1)
    }
    return Array.from({ length: 24 }, (_, i) => i)
  }, [use12Hour])

  const minutesList = React.useMemo(() => {
    const list: number[] = []
    for (let i = 0; i < 60; i += minuteStep) {
      list.push(i)
    }
    return list
  }, [minuteStep])

  const handleHourSelect = (hour: number) => {
    let newHours24 = hour
    if (use12Hour) {
      if (isPM) {
        newHours24 = hour === 12 ? 12 : hour + 12
      } else {
        newHours24 = hour === 12 ? 0 : hour
      }
    }
    onChange?.({ hours: newHours24, minutes: currentMinutes })
  }

  const handleMinuteSelect = (min: number) => {
    onChange?.({ hours: currentHours24, minutes: min })
  }

  const handlePeriodToggle = (period: "AM" | "PM") => {
    let newHours24 = currentHours24
    if (period === "AM" && isPM) {
      newHours24 = currentHours24 - 12
    } else if (period === "PM" && !isPM) {
      newHours24 = currentHours24 + 12
    }
    onChange?.({ hours: newHours24, minutes: currentMinutes })
  }

  const formattedDisplay = React.useMemo(() => {
    const h = String(use12Hour ? currentHours12 : currentHours24).padStart(
      2,
      "0"
    )
    const m = String(currentMinutes).padStart(2, "0")
    const p = use12Hour ? (isPM ? "PM" : "AM") : ""
    return `${h}:${m} ${p}`.trim()
  }, [use12Hour, currentHours12, currentHours24, currentMinutes, isPM])

  return (
    <div className={cn("flex flex-col gap-3 p-3 text-foreground", className)}>
      {/* Header display badge */}
      <div className="flex items-center justify-between border-border/60 border-b pb-2">
        <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Selected Time
        </span>
        <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-bold font-mono text-primary text-xs">
          {formattedDisplay}
        </span>
      </div>

      {/* Columns: Hours | Minutes | AM/PM */}
      <div className="grid grid-cols-3 gap-2">
        {/* Hours Column */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-medium text-[10px] text-muted-foreground uppercase">
            Hour
          </span>
          <ScrollArea className="h-44 w-full rounded-md border border-border/50 bg-background/50 p-1">
            <div className="flex flex-col gap-0.5">
              {hoursList.map((h) => {
                const isSelected = use12Hour
                  ? currentHours12 === h
                  : currentHours24 === h
                return (
                  <Button
                    key={`h-${h}`}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    disabled={disabled}
                    onClick={() => handleHourSelect(h)}
                    className={cn(
                      "h-7 w-full justify-center px-0 font-mono text-xs transition-colors",
                      isSelected
                        ? "font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Minutes Column */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-medium text-[10px] text-muted-foreground uppercase">
            Min
          </span>
          <ScrollArea className="h-44 w-full rounded-md border border-border/50 bg-background/50 p-1">
            <div className="flex flex-col gap-0.5">
              {minutesList.map((m) => {
                const isSelected =
                  Math.abs(currentMinutes - m) < minuteStep &&
                  (m === currentMinutes ||
                    (currentMinutes % minuteStep !== 0 &&
                      Math.floor(currentMinutes / minuteStep) * minuteStep ===
                        m))
                return (
                  <Button
                    key={`m-${m}`}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    disabled={disabled}
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      "h-7 w-full justify-center px-0 font-mono text-xs transition-colors",
                      isSelected
                        ? "font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Period Column (AM/PM) */}
        {use12Hour ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-medium text-[10px] text-muted-foreground uppercase">
              Period
            </span>
            <div className="flex w-full flex-col gap-1 rounded-md border border-border/50 bg-background/50 p-1">
              <Button
                type="button"
                variant={!isPM ? "default" : "ghost"}
                size="sm"
                disabled={disabled}
                onClick={() => handlePeriodToggle("AM")}
                className={cn(
                  "h-8 w-full justify-center px-0 font-semibold text-xs transition-colors",
                  !isPM
                    ? "shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                AM
              </Button>
              <Button
                type="button"
                variant={isPM ? "default" : "ghost"}
                size="sm"
                disabled={disabled}
                onClick={() => handlePeriodToggle("PM")}
                className={cn(
                  "h-8 w-full justify-center px-0 font-semibold text-xs transition-colors",
                  isPM
                    ? "shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                PM
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Time Presets Chips */}
      <div className="border-border/50 border-t pt-2.5">
        <span className="mb-1.5 block font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
          Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_QUICK_PRESETS.map((preset) => {
            const isMatch =
              preset.hours === currentHours24 &&
              preset.minutes === currentMinutes
            return (
              <button
                type="button"
                key={preset.label}
                disabled={disabled}
                onClick={() =>
                  onChange?.({ hours: preset.hours, minutes: preset.minutes })
                }
                className={cn(
                  "cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                  isMatch
                    ? "border-primary bg-primary/10 font-bold text-primary"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
