import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { TimePicker } from "./time-picker"

describe("TimePicker Component", () => {
  test("renders 12-hour format with hours, minutes, and AM/PM by default", () => {
    const html = renderToString(
      <TimePicker value={{ hours: 14, minutes: 30 }} use12Hour={true} />
    )

    // Should display 02:30 PM formatted
    expect(html).toContain("02:30 PM")
    expect(html).toContain("Selected Time")
    expect(html).toContain("Hour")
    expect(html).toContain("Min")
    expect(html).toContain("Period")
    expect(html).toContain("AM")
    expect(html).toContain("PM")
  })

  test("renders quick preset time chips", () => {
    const html = renderToString(<TimePicker value={{ hours: 9, minutes: 0 }} />)

    expect(html).toContain("09:00 AM")
    expect(html).toContain("12:00 PM")
    expect(html).toContain("02:00 PM")
    expect(html).toContain("05:00 PM")
    expect(html).toContain("08:00 PM")
  })

  test("renders 24-hour mode without AM/PM period toggles", () => {
    const html = renderToString(
      <TimePicker value={{ hours: 21, minutes: 45 }} use12Hour={false} />
    )

    expect(html).toContain("21:45")
    expect(html).not.toContain("Period")
  })
})
