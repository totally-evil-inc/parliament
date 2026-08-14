import { describe, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from "./task"

describe("Task", () => {
  test("renders trigger with status, count, items, and files", () => {
    const html = renderToString(
      <Task defaultOpen={true}>
        <TaskTrigger
          title="Prepare Proposal Document"
          status="in_progress"
          count={{ completed: 2, total: 3 }}
        />
        <TaskContent>
          <TaskItem status="completed">
            Extracted pricing terms
          </TaskItem>
          <TaskItem status="completed">
            Generated contract section
          </TaskItem>
          <TaskItem status="in_progress">
            <span className="inline-flex items-center gap-1">
              <span>Attaching stylesheet</span>
              <TaskItemFile>styles.json</TaskItemFile>
            </span>
          </TaskItem>
        </TaskContent>
      </Task>
    )

    expect(html).toContain("Prepare Proposal Document")
    expect(html).toContain("2/3")
    expect(html).toContain("Extracted pricing terms")
    expect(html).toContain("Generated contract section")
    expect(html).toContain("Attaching stylesheet")
    expect(html).toContain("styles.json")
    expect(html).toContain('data-slot="task-trigger"')
    expect(html).toContain('data-slot="task-content"')
  })
})
