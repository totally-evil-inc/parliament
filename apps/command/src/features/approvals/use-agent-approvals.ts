import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type PendingAction = {
  id: string
  organizationId: string
  conversationId: string
  messageId: string | null
  toolName: string
  toolArgs: Record<string, unknown>
  summary: string
  status: "pending" | "approved" | "rejected" | "expired"
  resolvedByUserId: string | null
  resolutionFeedback: string | null
  expiresAt: string | Date
  createdAt: string | Date
  updatedAt: string | Date
  confidenceScore?: number
}

function getAuthUrl(): string {
  return (
    import.meta.env.VITE_AUTH_SERVER_URL ||
    import.meta.env.VITE_BETTER_AUTH_URL ||
    "http://localhost:4000"
  )
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: { code?: string; message?: string } | string
      message?: string
    }
    if (typeof json.error === "object" && json.error?.message) {
      return json.error.message
    }
    if (typeof json.error === "string") {
      return json.error
    }
    return json.message || fallback
  } catch {
    return fallback
  }
}

async function fetchPendingActions(): Promise<PendingAction[]> {
  const authUrl = getAuthUrl()
  const res = await fetch(`${authUrl}/api/agent/actions/pending`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
  if (!res.ok) {
    if (res.status === 401) return []
    const message = await parseError(
      res,
      "Failed to fetch pending agent approvals"
    )
    throw new Error(message)
  }
  const json = (await res.json()) as {
    actions?: PendingAction[]
    pending?: PendingAction[]
  }
  return json.actions ?? json.pending ?? []
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["agent-approvals", "pending"],
    queryFn: fetchPendingActions,
    refetchInterval: 4000,
  })
}

export function useResolveAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      actionId,
      approved,
      feedback,
    }: {
      actionId: string
      approved: boolean
      feedback?: string
    }) => {
      const authUrl = getAuthUrl()
      const res = await fetch(
        `${authUrl}/api/agent/actions/${actionId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ approved, feedback }),
        }
      )
      if (!res.ok) {
        const message = await parseError(
          res,
          `Failed to ${approved ? "approve" : "reject"} action`
        )
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["agent-approvals", "pending"],
      })
      void queryClient.invalidateQueries({
        queryKey: ["agent", "conversations"],
      })
      void queryClient.invalidateQueries({ queryKey: ["proposals"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
      void queryClient.invalidateQueries({
        queryKey: ["scheduled-dispatches"],
      })
      void queryClient.invalidateQueries({ queryKey: ["deals"] })
      void queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useApproveAction() {
  const resolveMutation = useResolveAction()

  return useMutation({
    mutationFn: async ({
      actionId,
      feedback,
    }: {
      actionId: string
      feedback?: string
    }) => {
      return resolveMutation.mutateAsync({ actionId, approved: true, feedback })
    },
  })
}

export function useRejectAction() {
  const resolveMutation = useResolveAction()

  return useMutation({
    mutationFn: async ({
      actionId,
      feedback,
    }: {
      actionId: string
      feedback?: string
    }) => {
      return resolveMutation.mutateAsync({
        actionId,
        approved: false,
        feedback,
      })
    },
  })
}
