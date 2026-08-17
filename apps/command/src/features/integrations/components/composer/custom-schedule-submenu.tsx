import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

export interface CustomScheduleSubmenuProps {
  documentType?: "proposal" | "invoice"
  initialDate?: Date
  onSchedule: (formattedLabel: string, scheduledDate: Date) => void
  className?: string
}

export function CustomScheduleSubmenu({
  documentType = "proposal",
  initialDate,
  onSchedule,
  className,
}: CustomScheduleSubmenuProps) {
  const inputId = React.useId()

  const getTomorrowMorning = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }

  const [date, setDate] = React.useState<Date | undefined>(
    initialDate || getTomorrowMorning()
  )

  const [timeStr, setTimeStr] = React.useState<string>(() => {
    if (initialDate) {
      const h = String(initialDate.getHours()).padStart(2, "0")
      const m = String(initialDate.getMinutes()).padStart(2, "0")
      return `${h}:${m}`
    }
    return "09:00"
  })

  const combinedDateTime = React.useMemo((): Date | null => {
    if (!date) return null
    const [hoursStr, minutesStr] = timeStr.split(":")
    const hours = Number.parseInt(hoursStr || "9", 10)
    const minutes = Number.parseInt(minutesStr || "0", 10)
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }, [date, timeStr])

  const isPast = React.useMemo(() => {
    if (!combinedDateTime) return false
    return combinedDateTime.getTime() <= Date.now()
  }, [combinedDateTime])

  const formattedScheduleLabel = React.useMemo(() => {
    if (!combinedDateTime) return "Select date and time"
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
    return combinedDateTime.toLocaleString(undefined, options)
  }, [combinedDateTime])

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!combinedDateTime || isPast) return
    onSchedule(formattedScheduleLabel, combinedDateTime)
  }

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  return (
    <div
      role="presentation"
      className={cn(
        "flex w-[268px] flex-col gap-2.5 rounded-lg bg-popover p-1 text-popover-foreground text-xs",
        className
      )}
    >
      {/* Calendar Frame */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-background/60">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(d) => d < today}
          className="w-full p-2.5"
        />

        {/* Time Picker Input */}
        <div className="border-border/60 border-t bg-muted/30 p-2.5">
          <div className="flex items-center gap-2.5">
            <Label
              htmlFor={inputId}
              className="shrink-0 font-medium text-foreground text-xs"
            >
              Time
            </Label>
            <div className="relative grow">
              <Input
                id={inputId}
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                className="peer h-8 appearance-none ps-8 font-mono text-xs [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5 text-muted-foreground/80 peer-disabled:opacity-50">
                <ClockIcon aria-hidden="true" className="size-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target summary & Action Button */}
      <div className="flex flex-col gap-1.5 px-0.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Scheduled:</span>
          <span
            className={cn(
              "max-w-[170px] truncate font-medium",
              isPast ? "text-destructive" : "text-foreground"
            )}
          >
            {isPast ? "Time is in the past" : formattedScheduleLabel}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!combinedDateTime || isPast}
          onClick={handleConfirm}
          className="h-8 w-full gap-1.5 font-semibold text-xs shadow-2xs"
        >
          <CalendarDaysIcon className="size-3.5" />
          {`Schedule ${documentType === "proposal" ? "Proposal" : "Invoice"}`}
        </Button>
      </div>
    </div>
  )
}
