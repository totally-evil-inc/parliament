import { describe, expect, it } from "bun:test"
import {
  formatConversationDate,
  groupConversations,
  safeParseDate,
} from "./date-grouping"

describe("date-grouping helpers", () => {
  it("safeParseDate parses valid ISO strings and handles invalid inputs", () => {
    expect(safeParseDate("2026-08-19T12:00:00.000Z")).not.toBeNull()
    expect(safeParseDate("not-a-date")).toBeNull()
    expect(safeParseDate(null)).toBeNull()
    expect(safeParseDate(undefined)).toBeNull()
    expect(safeParseDate("")).toBeNull()
  })

  it("formatConversationDate returns relative or short date safely", () => {
    const now = new Date()
    expect(formatConversationDate(now.toISOString())).toBe("1m ago")
    expect(formatConversationDate("invalid")).toBe("Recently")
    expect(formatConversationDate(null)).toBe("Recently")
  })

  it("groupConversations groups pinned items separately and categorizes by date", () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    const old = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const items = [
      {
        id: "1",
        title: "Pinned Chat",
        pinned: true,
        updatedAt: now.toISOString(),
        model: null,
        messageCount: 3,
      },
      {
        id: "2",
        title: "Today Chat",
        pinned: false,
        updatedAt: now.toISOString(),
        model: null,
        messageCount: 1,
      },
      {
        id: "3",
        title: "Yesterday Chat",
        pinned: false,
        updatedAt: yesterday.toISOString(),
        model: null,
        messageCount: 2,
      },
      {
        id: "4",
        title: "Week Chat",
        pinned: false,
        updatedAt: lastWeek.toISOString(),
        model: null,
        messageCount: 5,
      },
      {
        id: "5",
        title: "Old Chat",
        pinned: false,
        updatedAt: old.toISOString(),
        model: null,
        messageCount: 10,
      },
    ]

    const groups = groupConversations(items)
    expect(groups.length).toBe(5)
    expect(groups[0].label).toBe("Pinned")
    expect(groups[0].conversations[0].id).toBe("1")
    expect(groups[1].label).toBe("Today")
    expect(groups[2].label).toBe("Yesterday")
    expect(groups[3].label).toBe("Previous 7 Days")
    expect(groups[4].label).toBe("Older")
  })
})
