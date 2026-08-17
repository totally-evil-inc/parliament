import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { CustomScheduleSubmenu } from "./custom-schedule-submenu"

describe("CustomScheduleSubmenu Component (comp-503)", () => {
  test("renders calendar, time input, and schedule send button for proposal", () => {
    const fixedDate = new Date(2026, 7, 20, 15, 30) // Aug 20, 2026 3:30 PM
    const html = renderToString(
      <CustomScheduleSubmenu
        documentType="proposal"
        initialDate={fixedDate}
        onSchedule={() => {}}
      />
    )

    expect(html).toContain("Time")
    expect(html).toContain('type="time"')
    expect(html).toContain("Schedule Proposal")
    expect(html).toContain("Scheduled:")
  })

  test("renders with default tomorrow 9:00 AM initial state for invoice", () => {
    const html = renderToString(
      <CustomScheduleSubmenu documentType="invoice" onSchedule={() => {}} />
    )

    expect(html).toContain("Schedule Invoice")
    expect(html).toContain('type="time"')
  })
})
