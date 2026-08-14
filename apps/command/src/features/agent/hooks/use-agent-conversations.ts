import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const AUTH_SERVER_URL =
  import.meta.env.VITE_AUTH_SERVER_URL ||
  import.meta.env.VITE_BETTER_AUTH_URL ||
  "http://localhost:4000"

export interface ConversationSummary {
  id: string
  title: string
  model: string | null
  updatedAt: string
  messageCount: number
}

export interface ConversationDetailResponse {
  conversation: ConversationSummary
  messages: Array<{
    id: string
    role: "user" | "assistant" | "system"
    parts: unknown[]
    status: "complete" | "interrupted" | "error"
    model: string | null
    createdAt: string
  }>
}

export function useConversations() {
  return useQuery<{ conversations: ConversationSummary[] }>({
    queryKey: ["agent", "conversations"],
    queryFn: async () => {
      const res = await fetch(`${AUTH_SERVER_URL}/api/agent/conversations`, {
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to fetch conversations")
      }
      return res.json()
    },
    staleTime: 5_000,
  })
}

export function useConversationDetail(threadId?: string) {
  return useQuery<ConversationDetailResponse>({
    queryKey: ["agent", "conversations", threadId],
    queryFn: async () => {
      if (!threadId) throw new Error("No threadId provided")
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${threadId}`,
        {
          credentials: "include",
        }
      )
      if (!res.ok) {
        throw new Error("Failed to fetch conversation details")
      }
      return res.json()
    },
    enabled: Boolean(threadId),
    retry: false,
    staleTime: 10_000,
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!res.ok) {
        throw new Error("Failed to delete conversation")
      }
      return res.json()
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      queryClient.removeQueries({ queryKey: ["agent", "conversations", id] })
    },
  })
}

export function useRenameConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(
        `${AUTH_SERVER_URL}/api/agent/conversations/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title }),
        }
      )
      if (!res.ok) {
        throw new Error("Failed to rename conversation")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent", "conversations"] })
      queryClient.invalidateQueries({
        queryKey: ["agent", "conversations", variables.id],
      })
    },
  })
}
