import { getValidCalendarAccessToken } from "./client"

export interface CalendarEventItem {
  id: string
  summary: string
  start: string
  end: string
  timeZone?: string
  attendees?: string[]
  htmlLink?: string
}

export async function listCalendarEvents(
  userId: string,
  days = 7,
  maxResults = 14
): Promise<CalendarEventItem[]> {
  const token = await getValidCalendarAccessToken(userId)

  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString()

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  )
  url.searchParams.set("timeMin", timeMin)
  url.searchParams.set("timeMax", timeMax)
  url.searchParams.set("maxResults", String(maxResults))
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy", "startTime")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google Calendar list API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { items?: Record<string, unknown>[] }
  const items = json.items ?? []

  return items.map((item) => {
    const startObj = (item.start ?? {}) as {
      dateTime?: string
      date?: string
      timeZone?: string
    }
    const endObj = (item.end ?? {}) as {
      dateTime?: string
      date?: string
      timeZone?: string
    }
    const rawAttendees = (item.attendees ?? []) as Array<{ email?: string }>

    const start = startObj.dateTime || startObj.date || new Date().toISOString()
    const end = endObj.dateTime || endObj.date || start
    const attendees = rawAttendees
      .map((a) => a.email)
      .filter((e): e is string => typeof e === "string")

    return {
      id: String(item.id || crypto.randomUUID()),
      summary: String(item.summary || "Untitled Event"),
      start,
      end,
      timeZone: startObj.timeZone || endObj.timeZone || "UTC",
      attendees: attendees.length > 0 ? attendees : undefined,
      htmlLink: typeof item.htmlLink === "string" ? item.htmlLink : undefined,
    }
  })
}

export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string
    start: string
    end?: string
    description?: string
    attendees?: string[]
    timeZone?: string
  }
): Promise<CalendarEventItem> {
  const token = await getValidCalendarAccessToken(userId)

  const timeZone = event.timeZone || "UTC"
  const startDate = new Date(event.start)
  const endDate = event.end
    ? new Date(event.end)
    : new Date(startDate.getTime() + 60 * 60 * 1000)

  const payload = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone,
    },
    ...(event.attendees && event.attendees.length > 0
      ? { attendees: event.attendees.map((email) => ({ email })) }
      : {}),
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google Calendar create API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as Record<string, unknown>
  const startObj = (json.start ?? {}) as {
    dateTime?: string
    timeZone?: string
  }
  const endObj = (json.end ?? {}) as { dateTime?: string; timeZone?: string }

  return {
    id: String(json.id || crypto.randomUUID()),
    summary: String(json.summary || event.summary),
    start: startObj.dateTime || startDate.toISOString(),
    end: endObj.dateTime || endDate.toISOString(),
    timeZone: startObj.timeZone || timeZone,
    attendees: event.attendees,
    htmlLink: typeof json.htmlLink === "string" ? json.htmlLink : undefined,
  }
}

export async function cancelCalendarEvent(
  userId: string,
  eventId: string
): Promise<{ eventId: string; cancelled: true }> {
  const token = await getValidCalendarAccessToken(userId)

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google Calendar cancel API error (${res.status}): ${text}`)
  }

  return { eventId, cancelled: true }
}
