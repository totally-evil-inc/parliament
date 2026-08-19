import type { QueryClient } from "@tanstack/react-query"
import { TOOL_CATALOG } from "@workspace/agent"

const READ_ONLY_PREFIX_REGEX = /^(get|list|search|check|verify|read|ask|find)[-_]/i

/**
 * Determines defensively whether a tool execution modifies server-side state.
 * Leverages TOOL_CATALOG capability metadata, falling back to prefix heuristics for uncataloged tools.
 */
export function isMutatingTool(toolName: unknown): boolean {
  if (typeof toolName !== "string" || !toolName.trim()) {
    return false
  }

  const normalized = toolName.trim().toLowerCase()
  const entry = (TOOL_CATALOG as Record<string, { capability?: string; category?: string }>)[normalized]

  if (entry) {
    return entry.capability !== "READ_ONLY" && entry.category !== "read"
  }

  // Defensive fallback for uncataloged/dynamic tools
  if (READ_ONLY_PREFIX_REGEX.test(normalized)) {
    return false
  }

  // Conservatively assume mutating for unrecognized actions without read prefixes
  return true
}

export interface InvalidateAgentQueriesOptions {
  queryClient: QueryClient
  executedToolNames?: Set<string> | Iterable<string> | null
  threadId?: string | null
}

/**
 * Precision cache invalidation for TanStack Query based on mutating tool capabilities.
 * Prevents unnecessary network waterfall refetches caused by read-only tool executions.
 */
export function invalidateAgentQueries({
  queryClient,
  executedToolNames,
  threadId,
}: InvalidateAgentQueriesOptions): void {
  if (!queryClient) return

  // Always refresh conversation metadata
  queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
  if (typeof threadId === "string" && threadId.trim()) {
    queryClient.invalidateQueries({
      queryKey: ["agent", "conversations", threadId.trim()],
    })
  }

  if (!executedToolNames) return

  const toolNames = Array.from(executedToolNames).filter(
    (name): name is string => typeof name === "string" && Boolean(name.trim())
  )

  if (toolNames.length === 0) return

  // Only invalidate business entities if at least one mutating tool ran
  for (const tool of toolNames) {
    if (!isMutatingTool(tool)) {
      continue
    }

    const lower = tool.toLowerCase()

    if (lower.includes("proposal")) {
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
    }
    if (lower.includes("invoice") || lower.includes("billing")) {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
    }
    if (lower.includes("schedule") || lower.includes("dispatch")) {
      queryClient.invalidateQueries({ queryKey: ["scheduled-dispatches"] })
    }
    if (lower.includes("customer") || lower.includes("contact")) {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
    }
    if (lower.includes("deal") || lower.includes("stage")) {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
    }
  }
}
