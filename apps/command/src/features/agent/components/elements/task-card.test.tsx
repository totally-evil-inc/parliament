import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { deriveAggregateTaskStatus, TaskCard } from "./task-card"

describe("deriveAggregateTaskStatus", () => {
  test("returns pending when no items are passed and no explicit status", () => {
    expect(deriveAggregateTaskStatus()).toBe("pending")
    expect(deriveAggregateTaskStatus(undefined, [])).toBe("pending")
  })

  test("returns explicit status when items are empty", () => {
    expect(deriveAggregateTaskStatus("completed", [])).toBe("completed")
  })

  test("returns error if any item has errored", () => {
    expect(
      deriveAggregateTaskStatus("in_progress", [
        { text: "Fetch context", status: "completed" },
        { text: "Generate PDF", status: "error" },
        { text: "Send email", status: "pending" },
      ])
    ).toBe("error")
  })

  test("returns in_progress if any item is active", () => {
    expect(
      deriveAggregateTaskStatus(undefined, [
        { text: "Read deals", status: "completed" },
        { text: "Synthesize terms", status: "in_progress" },
        { text: "Compile proposal", status: "pending" },
      ])
    ).toBe("in_progress")
  })

  test("returns completed only when all items are completed", () => {
    expect(
      deriveAggregateTaskStatus(undefined, [
        { text: "Task 1", status: "completed" },
        { text: "Task 2", status: "completed" },
      ])
    ).toBe("completed")
  })

  test("returns pending when all items are pending", () => {
    expect(
      deriveAggregateTaskStatus(undefined, [
        { text: "Task 1", status: "pending" },
        { text: "Task 2", status: "pending" },
      ])
    ).toBe("pending")
  })
})

describe("TaskCard Component", () => {
  test("renders truthful progress counter badge and task items", () => {
    const html = renderToString(
      <TaskCard
        title="Proposal Synthesis"
        defaultOpen={true}
        items={[
          { text: "Analyze client requirements", status: "completed" },
          { text: "Draft commercial milestones", status: "in_progress" },
          { text: "Format PDF preview", status: "pending" },
        ]}
      />
    )

    expect(html).toContain("Proposal Synthesis")
    expect(html).toContain("1/3")
    expect(html).toContain("Analyze client requirements")
    expect(html).toContain("Draft commercial milestones")
    expect(html).toContain("Format PDF preview")
  })

  test("renders file attachment when provided in task item", () => {
    const html = renderToString(
      <TaskCard
        title="Document Processing"
        defaultOpen={true}
        items={[
          {
            text: "Exported blueprint",
            status: "completed",
            file: { name: "proposal-q3.pdf" },
          },
        ]}
      />
    )

    expect(html).toContain("Exported blueprint")
    expect(html).toContain("proposal-q3.pdf")
  })
})
