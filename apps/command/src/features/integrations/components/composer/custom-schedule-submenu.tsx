import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"

export interface CustomScheduleSubmenuProps {
  documentType?: "proposal" | "invoice"
  initialDate?: Date
  onSchedule: (formattedLabel: string, scheduledDate: Date) => void
  className?: string
}

const TIME_CHIPS = [
  { label: "9 AM", hours: 9, minutes: 0 },
  { label: "1 PM", hours: 13, minutes: 0 },
  { label: "5 PM", hours: 17, minutes: 0 },
  { label: "8 PM", hours: 20, minutes: 0 },
]

export function CustomScheduleSubmenu({
  documentType = "proposal",
  initialDate,
  onSchedule,
  className,
}: CustomScheduleSubmenuProps) {
  const getTomorrowMorning = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }

  const [date, setDate] = React.useState<Date | undefined>(
    initialDate || getTomorrowMorning()
  )

  const [hours12, setHours12] = React.useState<number>(() => {
    if (initialDate) {
      const h = initialDate.getHours()
      return h % 12 === 0 ? 12 : h % 12
    }
    return 9
  })

  const [minutes, setMinutes] = React.useState<number>(() => {
    return initialDate ? initialDate.getMinutes() : 0
  })

  const [period, setPeriod] = React.useState<"AM" | "PM">(() => {
    if (initialDate) {
      return initialDate.getHours() >= 12 ? "PM" : "AM"
    }
    return "AM"
  })

  const combinedDateTime = React.useMemo((): Date | null => {
    if (!date) return null
    let h24 = hours12 % 12
    if (period === "PM") h24 += 12
    const result = new Date(date)
    result.setHours(h24, minutes, 0, 0)
    return result
  }, [date, hours12, minutes, period])

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

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10)
    if (Number.isNaN(val)) return
    if (val >= 1 && val <= 12) {
      setHours12(val)
    }
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10)
    if (Number.isNaN(val)) return
    if (val >= 0 && val <= 59) {
      setMinutes(val)
    }
  }

  const applyPreset = (h: number, m: number) => {
    setHours12(h % 12 === 0 ? 12 : h % 12)
    setMinutes(m)
    setPeriod(h >= 12 ? "PM" : "AM")
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

        {/* Tailored Time Selector Row */}
        <div className="border-border/60 border-t bg-muted/30 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <ClockIcon className="size-3.5 text-muted-foreground/80" />
              <span className="font-medium text-[11px] uppercase tracking-wider">
                Time
              </span>
            </div>

            {/* Segmented Time Inputs & AM/PM Toggle */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded-md border border-border/80 bg-background px-1.5 py-0.5 shadow-2xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={String(hours12).padStart(2, "0")}
                  onChange={handleHourChange}
                  className="w-5 bg-transparent p-0 text-center font-medium font-mono text-foreground text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Hours"
                />
                <span className="text-muted-foreground/60">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={String(minutes).padStart(2, "0")}
                  onChange={handleMinuteChange}
                  className="w-5 bg-transparent p-0 text-center font-medium font-mono text-foreground text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Minutes"
                />
              </div>

              {/* AM / PM Segmented Switch */}
              <div className="flex rounded-md border border-border/80 bg-background p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={cn(
                    "rounded-xs px-1.5 py-0.5 font-bold text-[10px] transition-all",
                    period === "AM"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("PM")}
                  className={cn(
                    "rounded-xs px-1.5 py-0.5 font-bold text-[10px] transition-all",
                    period === "PM"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Time Preset Chips */}
          <div className="mt-2 flex items-center justify-between gap-1">
            {TIME_CHIPS.map((chip) => {
              const chipH12 = chip.hours % 12 === 0 ? 12 : chip.hours % 12
              const chipPeriod = chip.hours >= 12 ? "PM" : "AM"
              const isSelected =
                hours12 === chipH12 &&
                minutes === chip.minutes &&
                period === chipPeriod

              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => applyPreset(chip.hours, chip.minutes)}
                  className={cn(
                    "flex-1 rounded border py-0.5 text-center font-mono text-[10px] transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-border/50 bg-background/50 text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
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
