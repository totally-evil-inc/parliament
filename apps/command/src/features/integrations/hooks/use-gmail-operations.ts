import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const AUTH_SERVER_URL =
  import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:4000"

export interface SendGmailPayload {
  to: string
  subject: string
  htmlText: string
  plainText?: string
  replyTo?: string
}

export interface ThreadActivityItem {
  id: string
  threadId: string
  senderEmail: string
  subject?: string
  lastMessageAt: string
  responseVelocityMs?: number
  isSilent: boolean
}

export interface ThreadActivityResponse {
  activities: ThreadActivityItem[]
  subscription?: {
    historyId?: string
    status: string
    expiration?: string
  } | null
}

/**
 * Hook to send proposals/invoices directly via Gmail (gmail.send)
 */
export function useSendGmailEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendGmailPayload) => {
      const res = await fetch(`${AUTH_SERVER_URL}/api/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to send email via Gmail API")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-thread-activity"] })
    },
  })
}

/**
 * Hook to fetch real-time client communication activity heatmaps & silence alerts (gmail.metadata)
 */
export function useGmailThreadActivity() {
  return useQuery<ThreadActivityResponse>({
    queryKey: ["gmail-thread-activity"],
    queryFn: async () => {
      const res = await fetch(`${AUTH_SERVER_URL}/api/gmail/thread-activity`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("Failed to fetch Gmail thread activity")
      }

      return res.json().catch(() => {
        throw new Error("Invalid JSON response from server")
      })
    },
  })
}

/**
 * Hook to register real-time Google Cloud Pub/Sub watch notifications
 */
export function useRegisterGmailWatch() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, string | undefined>({
    mutationFn: async (topicName?: string) => {
      const res = await fetch(`${AUTH_SERVER_URL}/api/gmail/watch/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topicName: topicName ?? undefined }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to register Gmail watch")
      }

      return res.json().catch(() => {
        throw new Error("Invalid JSON response from server")
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-thread-activity"] })
    },
  })
}
