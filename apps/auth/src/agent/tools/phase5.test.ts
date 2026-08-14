import { describe, expect, test } from "bun:test"
import type { AgentContext } from "../tool-ctx"
import {
  gcalCancelEventTool,
  gcalCreateEventTool,
  gcalListEventsTool,
} from "./calendar"
import { gmailCreateDraftTool, gmailSendEmailTool } from "./gmail"

describe("Phase 5 Gmail & Google Calendar Tools", () => {
  const ctx: AgentContext = {
    organizationId: "00000000-0000-7000-8000-000000000001",
    userId: "00000000-0000-7000-8000-000000000001",
    userEmail: "test@example.com",
    orgName: "Test Org",
  }

  test("gmailSendEmailTool returns integration_not_connected when user has no connected Gmail", async () => {
    const wrapped = gmailSendEmailTool(ctx)
    const result = await (
      wrapped as unknown as {
        execute: (args: unknown) => Promise<Record<string, unknown>>
      }
    ).execute({
      to: "recipient@test.local",
      subject: "Test Subject",
      htmlText: "<p>Test</p>",
    })
    expect(result.error).toBeDefined()
    const err = result.error as { code: string; provider: string }
    expect(err.code).toBe("integration_not_connected")
    expect(err.provider).toBe("gmail")
  })

  test("gmailCreateDraftTool returns integration_not_connected when user has no connected Gmail", async () => {
    const wrapped = gmailCreateDraftTool(ctx)
    const result = await (
      wrapped as unknown as {
        execute: (args: unknown) => Promise<Record<string, unknown>>
      }
    ).execute({
      to: "recipient@test.local",
      subject: "Test Draft",
      htmlText: "<p>Draft</p>",
    })
    expect(result.error).toBeDefined()
    const err = result.error as { code: string; provider: string }
    expect(err.code).toBe("integration_not_connected")
    expect(err.provider).toBe("gmail")
  })

  test("gcalListEventsTool returns integration_not_connected when user has no connected Calendar", async () => {
    const wrapped = gcalListEventsTool(ctx)
    const result = await (
      wrapped as unknown as {
        execute: (args: unknown) => Promise<Record<string, unknown>>
      }
    ).execute({
      days: 7,
    })
    expect(result.error).toBeDefined()
    const err = result.error as { code: string; provider: string }
    expect(err.code).toBe("integration_not_connected")
    expect(err.provider).toBe("google-calendar")
  })

  test("gcalCreateEventTool returns integration_not_connected when user has no connected Calendar", async () => {
    const wrapped = gcalCreateEventTool(ctx)
    const result = await (
      wrapped as unknown as {
        execute: (args: unknown) => Promise<Record<string, unknown>>
      }
    ).execute({
      summary: "Sync Meeting",
      start: new Date().toISOString(),
    })
    expect(result.error).toBeDefined()
    const err = result.error as { code: string; provider: string }
    expect(err.code).toBe("integration_not_connected")
    expect(err.provider).toBe("google-calendar")
  })

  test("gcalCancelEventTool returns integration_not_connected when user has no connected Calendar", async () => {
    const wrapped = gcalCancelEventTool(ctx)
    const result = await (
      wrapped as unknown as {
        execute: (args: unknown) => Promise<Record<string, unknown>>
      }
    ).execute({
      eventId: "event-123",
    })
    expect(result.error).toBeDefined()
    const err = result.error as { code: string; provider: string }
    expect(err.code).toBe("integration_not_connected")
    expect(err.provider).toBe("google-calendar")
  })
})
