import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type PendingAction = {
  id: string
  agentId: string
  userId: string
  toolName: string
  args: any
  reason: string
  confidenceScore: number
  status: "pending" | "approved" | "rejected" | "expired"
  createdAt: string
  expiresAt: string
}

async function fetchPendingActions(): Promise<PendingAction[]> {
  const authUrl = import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
  const res = await fetch(`${authUrl}/api/auth/agent/pending`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
  if (!res.ok) {
    if (res.status === 401) return []
    throw new Error("Failed to fetch pending agent approvals")
  }
  const json = await res.json()
  return json.pending ?? []
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["agent-approvals", "pending"],
    queryFn: fetchPendingActions,
    refetchInterval: 3000, // Poll every 3 seconds for new agent requests
  })
}

export function useApproveAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => {
      const authUrl = import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
      const res = await fetch(`${authUrl}/api/auth/agent/actions/${actionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to approve action")
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agent-approvals", "pending"] })
    },
  })
}

export function useRejectAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => {
      const authUrl = import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
      const res = await fetch(`${authUrl}/api/auth/agent/actions/${actionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to reject action")
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agent-approvals", "pending"] })
    },
  })
}
