import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@workspace/ui/components/sonner"
import { z } from "zod"

const AUTH_SERVER_URL =
  import.meta.env.VITE_AUTH_SERVER_URL ||
  import.meta.env.VITE_BETTER_AUTH_URL ||
  "http://localhost:4000"

export const conversationSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().default("Untitled Conversation"),
  model: z.string().nullable().optional().default(null),
  pinned: z.boolean().optional().default(false),
  updatedAt: z.string(),
  messageCount: z.number().int().nonnegative().default(0),
})

export type ConversationSummary = z.infer<typeof conversationSummarySchema>

export const conversationListResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema).default([]),
})

export const conversationMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.unknown()).default([]),
  status: z.enum(["complete", "interrupted", "error"]).default("complete"),
  model: z.string().nullable().optional().default(null),
  createdAt: z.string(),
})

export const conversationDetailResponseSchema = z.object({
  conversation: conversationSummarySchema,
  messages: z.array(conversationMessageSchema).default([]),
})

export type ConversationDetailResponse = z.infer<
  typeof conversationDetailResponseSchema
>

/**
 * Fetch and defensively parse all conversations for the active organization.
 */
export function useConversations() {
  return useQuery<{ conversations: ConversationSummary[] }>({
    queryKey: ["agent", "conversations"],
    queryFn: async () => {
      try {
        const res = await fetch(`${AUTH_SERVER_URL}/api/agent/conversations`, {
          credentials: "include",
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          throw new Error(
            errBody?.error || `Failed to fetch conversations (${res.status})`
          )
        }
        const raw = await res.json()
        const parsed = conversationListResponseSchema.safeParse(raw)
        if (!parsed.success) {
          console.error(
            "Conversation list validation warning:",
            parsed.error.flatten()
          )
          // Graceful fallback if shape is slightly variant
          const rawList = Array.isArray(raw?.conversations)
            ? raw.conversations
            : []
          return {
            conversations: rawList.map((item: Record<string, unknown>) => ({
              id: String(item?.id ?? ""),
              title: String(item?.title ?? "Untitled Conversation"),
              model: item?.model ? String(item.model) : null,
              pinned: Boolean(item?.pinned),
              updatedAt: item?.updatedAt
                ? String(item.updatedAt)
                : new Date().toISOString(),
              messageCount: Number(item?.messageCount ?? 0),
            })),
          }
        }
        return parsed.data
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Network error fetching conversations"
        throw new Error(message)
      }
    },
    staleTime: 5_000,
  })
}

/**
 * Query options factory for single thread conversation details.
 * Shared across router loader prefetch and in-component hydration to prevent duplicate fetches.
 */
export function conversationDetailQueryOptions(threadId: string) {
  const cleanId = typeof threadId === "string" ? threadId.trim() : ""
  return {
    queryKey: ["agent", "conversations", cleanId] as const,
    queryFn: async (): Promise<ConversationDetailResponse> => {
      if (!cleanId) {
        throw new Error("Invalid threadId provided")
      }
      try {
        const res = await fetch(
          `${AUTH_SERVER_URL}/api/agent/conversations/${encodeURIComponent(cleanId)}`,
          {
            credentials: "include",
          }
        )
        if (!res.ok) {
          const errBody = await res.json().catch(() => null)
          throw new Error(
            errBody?.error?.message ||
              errBody?.error ||
              `Failed to fetch conversation details (${res.status})`
          )
        }
        const raw = await res.json()
        const parsed = conversationDetailResponseSchema.safeParse(raw)
        if (!parsed.success) {
          console.error(
            "Conversation detail validation warning:",
            parsed.error.flatten()
          )
          return raw as ConversationDetailResponse
        }
        return parsed.data
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load conversation details"
        throw new Error(message)
      }
    },
    staleTime: 60_000,
  }
}

/**
 * Fetch and defensively parse full details for a single thread.
 */
export function useConversationDetail(threadId?: string) {
  const options = conversationDetailQueryOptions(threadId || "")
  return useQuery<ConversationDetailResponse>({
    ...options,
    enabled: Boolean(threadId && threadId.trim().length > 0),
    retry: false,
  })
}

/**
 * Optimistic mutation to toggle pinned state on a conversation.
 */
export function useTogglePinConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pinned }),
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(
          errBody?.error || `Failed to update pinned state (${res.status})`
        )
      }
      return res.json()
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["agent", "conversations"] })
      const previousData = queryClient.getQueryData<{
        conversations: ConversationSummary[]
      }>(["agent", "conversations"])

      if (previousData?.conversations) {
        queryClient.setQueryData<{ conversations: ConversationSummary[] }>(
          ["agent", "conversations"],
          {
            conversations: previousData.conversations.map((c) =>
              c.id === id ? { ...c, pinned } : c
            ),
          }
        )
      }
      return { previousData }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["agent", "conversations"],
          context.previousData
        )
      }
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${variables.pinned ? "pin" : "unpin"} conversation`
      )
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.pinned ? "Conversation pinned" : "Conversation unpinned"
      )
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      queryClient.invalidateQueries({
        queryKey: ["agent", "conversations", variables.id],
      })
    },
  })
}

/**
 * Optimistic mutation to rename a conversation title.
 */
export function useRenameConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const trimmed = title.trim()
      if (!trimmed) {
        throw new Error("Title cannot be empty")
      }
      if (trimmed.length > 120) {
        throw new Error("Title cannot exceed 120 characters")
      }

      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: trimmed }),
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(
          errBody?.error || `Failed to rename conversation (${res.status})`
        )
      }
      return res.json()
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ["agent", "conversations"] })
      const previousData = queryClient.getQueryData<{
        conversations: ConversationSummary[]
      }>(["agent", "conversations"])

      if (previousData?.conversations) {
        queryClient.setQueryData<{ conversations: ConversationSummary[] }>(
          ["agent", "conversations"],
          {
            conversations: previousData.conversations.map((c) =>
              c.id === id ? { ...c, title: title.trim() } : c
            ),
          }
        )
      }
      return { previousData }
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["agent", "conversations"],
          context.previousData
        )
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to rename conversation"
      )
    },
    onSuccess: (_data, variables) => {
      toast.success("Conversation renamed")
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      queryClient.invalidateQueries({
        queryKey: ["agent", "conversations", variables.id],
      })
    },
  })
}

/**
 * Optimistic mutation to delete a conversation.
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(
          errBody?.error || `Failed to delete conversation (${res.status})`
        )
      }
      return res.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["agent", "conversations"] })
      const previousData = queryClient.getQueryData<{
        conversations: ConversationSummary[]
      }>(["agent", "conversations"])

      if (previousData?.conversations) {
        queryClient.setQueryData<{ conversations: ConversationSummary[] }>(
          ["agent", "conversations"],
          {
            conversations: previousData.conversations.filter(
              (c) => c.id !== id
            ),
          }
        )
      }
      return { previousData }
    },
    onError: (err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["agent", "conversations"],
          context.previousData
        )
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to delete conversation"
      )
    },
    onSuccess: (_data, id) => {
      toast.success("Conversation deleted")
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      queryClient.removeQueries({ queryKey: ["agent", "conversations", id] })
    },
  })
}
