import { toolDefinition } from "@tanstack/ai"
import {
  gcalCancelEventInput,
  gcalCancelEventOutput,
  gcalCreateEventInput,
  gcalCreateEventOutput,
  gcalListEventsOutput,
} from "@workspace/agent"
import { z } from "zod"
import {
  cancelCalendarEvent,
  createCalendarEvent,
  listCalendarEvents,
} from "../../lib/calendar/events"
import type { AgentContext } from "../tool-ctx"

export function gcalListEventsTool(ctx: AgentContext) {
  return toolDefinition({
    name: "gcal_list_events",
    description:
      "List upcoming events on the user's Google Calendar (default: next 7 days, up to 14). Auto-run.",
    inputSchema: z.object({ days: z.number().optional() }),
    outputSchema: gcalListEventsOutput,
    needsApproval: false,
  }).server(async (args) => {
    try {
      const events = await listCalendarEvents(ctx.userId, args?.days ?? 7, 14)
      return { events }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("integration_not_connected") ||
          err.message.includes("No connected"))
      ) {
        return {
          error: {
            code: "integration_not_connected" as const,
            message:
              "Google Calendar is not connected. Please connect Google Calendar in /integrations.",
            provider: "google-calendar" as const,
          },
        }
      }
      throw err
    }
  })
}

export function gcalCreateEventTool(ctx: AgentContext) {
  return toolDefinition({
    name: "gcal_create_event",
    description:
      "Create an event on the user's Google Calendar. Requires human approval before creating.",
    inputSchema: gcalCreateEventInput,
    outputSchema: gcalCreateEventOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const event = await createCalendarEvent(ctx.userId, {
        summary: args.summary,
        start: args.start,
        end: args.end,
        description: args.description,
        attendees: args.attendees,
        timeZone: args.timeZone,
      })
      return event
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("integration_not_connected") ||
          err.message.includes("No connected"))
      ) {
        return {
          error: {
            code: "integration_not_connected" as const,
            message:
              "Google Calendar is not connected. Please connect Google Calendar in /integrations.",
            provider: "google-calendar" as const,
          },
        }
      }
      throw err
    }
  })
}

export function gcalCancelEventTool(ctx: AgentContext) {
  return toolDefinition({
    name: "gcal_cancel_event",
    description:
      "Cancel (delete) an event on the user's Google Calendar. Requires human approval.",
    inputSchema: gcalCancelEventInput,
    outputSchema: gcalCancelEventOutput,
    needsApproval: true,
  }).server(async (args) => {
    try {
      const result = await cancelCalendarEvent(ctx.userId, args.eventId)
      return result
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("integration_not_connected") ||
          err.message.includes("No connected"))
      ) {
        return {
          error: {
            code: "integration_not_connected" as const,
            message:
              "Google Calendar is not connected. Please connect Google Calendar in /integrations.",
            provider: "google-calendar" as const,
          },
        }
      }
      throw err
    }
  })
}
