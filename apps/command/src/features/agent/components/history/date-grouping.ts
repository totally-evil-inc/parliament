import type { ConversationSummary } from "../../hooks/use-agent-conversations"

export interface ConversationDateGroup {
  label: string
  conversations: ConversationSummary[]
}

/**
 * Defensively parses an ISO timestamp or date string into a Date object.
 * Returns null if the timestamp is missing or invalid.
 */
export function safeParseDate(input?: string | null): Date | null {
  if (!input || typeof input !== "string") return null
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Returns a human-friendly relative or short date label defensively.
 */
export function formatConversationDate(input?: string | null): string {
  const date = safeParseDate(input)
  if (!date) return "Recently"

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 60 * 1000) return "Just now"

  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    return `${diffMinutes}m ago`
  }

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `${Math.floor(diffHours)}h ago`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday"
  }

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: "short" })
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Groups a list of conversations into Pinned, Today, Yesterday, Previous 7 days, Previous 30 days, Older.
 */
export function groupConversations(
  conversations: ConversationSummary[]
): ConversationDateGroup[] {
  if (!Array.isArray(conversations) || conversations.length === 0) return []

  const pinned: ConversationSummary[] = []
  const today: ConversationSummary[] = []
  const yesterday: ConversationSummary[] = []
  const previous7Days: ConversationSummary[] = []
  const previous30Days: ConversationSummary[] = []
  const older: ConversationSummary[] = []

  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  ).getTime()
  const startOf7Days = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7
  ).getTime()
  const startOf30Days = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 30
  ).getTime()

  for (const c of conversations) {
    if (c.pinned) {
      pinned.push(c)
      continue
    }

    const date = safeParseDate(c.updatedAt)
    if (!date) {
      older.push(c)
      continue
    }

    const time = date.getTime()
    if (time >= startOfToday) {
      today.push(c)
    } else if (time >= startOfYesterday) {
      yesterday.push(c)
    } else if (time >= startOf7Days) {
      previous7Days.push(c)
    } else if (time >= startOf30Days) {
      previous30Days.push(c)
    } else {
      older.push(c)
    }
  }

  const groups: ConversationDateGroup[] = []

  if (pinned.length > 0) {
    groups.push({ label: "Pinned", conversations: pinned })
  }
  if (today.length > 0) {
    groups.push({ label: "Today", conversations: today })
  }
  if (yesterday.length > 0) {
    groups.push({ label: "Yesterday", conversations: yesterday })
  }
  if (previous7Days.length > 0) {
    groups.push({ label: "Previous 7 Days", conversations: previous7Days })
  }
  if (previous30Days.length > 0) {
    groups.push({ label: "Previous 30 Days", conversations: previous30Days })
  }
  if (older.length > 0) {
    groups.push({ label: "Older", conversations: older })
  }

  return groups
}
