import { describe, expect, mock, test } from "bun:test"
import type { QueryClient } from "@tanstack/react-query"
import { invalidateAgentQueries, isMutatingTool } from "./query-invalidation"

describe("query-invalidation helper", () => {
  describe("isMutatingTool", () => {
    test("correctly identifies read-only tools from TOOL_CATALOG", () => {
      expect(isMutatingTool("list_proposals")).toBe(false)
      expect(isMutatingTool("get_proposal")).toBe(false)
      expect(isMutatingTool("list_deals")).toBe(false)
      expect(isMutatingTool("get_deal")).toBe(false)
      expect(isMutatingTool("list_customers")).toBe(false)
      expect(isMutatingTool("get_customer")).toBe(false)
      expect(isMutatingTool("ask_clarifying_questions")).toBe(false)
      expect(isMutatingTool("verify_org_access")).toBe(false)
    })

    test("correctly identifies mutating tools from TOOL_CATALOG", () => {
      expect(isMutatingTool("create_proposal")).toBe(true)
      expect(isMutatingTool("update_proposal")).toBe(true)
      expect(isMutatingTool("create_invoice")).toBe(true)
      expect(isMutatingTool("send_proposal")).toBe(true)
      expect(isMutatingTool("schedule_document_send")).toBe(true)
      expect(isMutatingTool("update_deal_stage")).toBe(true)
      expect(isMutatingTool("gmail_send_email")).toBe(true)
      expect(isMutatingTool("gcal_create_event")).toBe(true)
    })

    test("handles uncataloged tools defensively using heuristics", () => {
      expect(isMutatingTool("get_custom_stats")).toBe(false)
      expect(isMutatingTool("list_custom_items")).toBe(false)
      expect(isMutatingTool("search_logs")).toBe(false)
      expect(isMutatingTool("mutate_custom_item")).toBe(true)
      expect(isMutatingTool("custom_action")).toBe(true)
    })

    test("handles invalid or non-string inputs safely", () => {
      expect(isMutatingTool(null)).toBe(false)
      expect(isMutatingTool(undefined)).toBe(false)
      expect(isMutatingTool("")).toBe(false)
      expect(isMutatingTool("   ")).toBe(false)
      expect(isMutatingTool(123 as any)).toBe(false)
    })
  })

  describe("invalidateAgentQueries", () => {
    test("does not invalidate data queries for purely read-only tool sets", () => {
      const invalidatedKeys: any[] = []
      const fakeQueryClient = {
        invalidateQueries: mock(({ queryKey }: { queryKey: any[] }) => {
          invalidatedKeys.push(queryKey)
        }),
      } as unknown as QueryClient

      invalidateAgentQueries({
        queryClient: fakeQueryClient,
        executedToolNames: new Set(["list_proposals", "get_customer"]),
        threadId: "thread-123",
      })

      // Only conversations should be invalidated, NOT proposals or customers
      expect(invalidatedKeys).toEqual([
        ["agent", "conversations"],
        ["agent", "conversations", "thread-123"],
      ])
    })

    test("invalidates target domain queries when mutating tools execute", () => {
      const invalidatedKeys: any[] = []
      const fakeQueryClient = {
        invalidateQueries: mock(({ queryKey }: { queryKey: any[] }) => {
          invalidatedKeys.push(queryKey)
        }),
      } as unknown as QueryClient

      invalidateAgentQueries({
        queryClient: fakeQueryClient,
        executedToolNames: new Set(["create_proposal"]),
        threadId: "thread-123",
      })

      expect(invalidatedKeys).toContainEqual(["agent", "conversations"])
      expect(invalidatedKeys).toContainEqual([
        "agent",
        "conversations",
        "thread-123",
      ])
      expect(invalidatedKeys).toContainEqual(["proposals"])
      expect(invalidatedKeys).toContainEqual(["deals"])
      expect(invalidatedKeys).toContainEqual(["deal-analytics"])
      expect(invalidatedKeys).not.toContainEqual(["invoices"])
    })

    test("handles empty, whitespace, and null options gracefully", () => {
      const invalidatedKeys: any[] = []
      const fakeQueryClient = {
        invalidateQueries: mock(({ queryKey }: { queryKey: any[] }) => {
          invalidatedKeys.push(queryKey)
        }),
      } as unknown as QueryClient

      invalidateAgentQueries({
        queryClient: fakeQueryClient,
        executedToolNames: null,
        threadId: "   ",
      })

      expect(invalidatedKeys).toEqual([["agent", "conversations"]])
    })

    test("invalidates domain queries when a resolved action tool name is passed", () => {
      const invalidatedKeys: any[] = []
      const fakeQueryClient = {
        invalidateQueries: mock(({ queryKey }: { queryKey: any[] }) => {
          invalidatedKeys.push(queryKey)
        }),
      } as unknown as QueryClient

      invalidateAgentQueries({
        queryClient: fakeQueryClient,
        executedToolNames: new Set(["schedule_document_send"]),
        threadId: "thread-456",
      })

      expect(invalidatedKeys).toContainEqual(["scheduled-dispatches"])
    })
  })
})
