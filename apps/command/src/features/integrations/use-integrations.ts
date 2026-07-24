import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import type { Integration } from "./data"
import { DEFAULT_INTEGRATIONS } from "./data"

export type ConnectedAccount = {
  id: string
  providerId: string
  accountId: string
  createdAt: string
  updatedAt: string
}

async function fetchConnectedAccounts(): Promise<ConnectedAccount[]> {
  const authUrl = import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
  const res = await fetch(`${authUrl}/api/auth/integrations/list`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
  if (!res.ok) {
    if (res.status === 401) {
      return []
    }
    throw new Error("Failed to fetch connected accounts")
  }
  const json = await res.json()
  return json.accounts ?? []
}

export function useIntegrations() {
  const { data: accounts, isLoading, isError, refetch } = useQuery({
    queryKey: ["integrations", "connected-accounts"],
    queryFn: fetchConnectedAccounts,
    staleTime: 10_000,
  })

  const mergedIntegrations: Integration[] = DEFAULT_INTEGRATIONS.map((item) => {
    const isConnected = accounts?.some((acc) => acc.providerId === item.providerId)
    return {
      ...item,
      status: isConnected ? "connected" : "available",
    }
  })

  return {
    data: mergedIntegrations,
    isLoading,
    isError,
    refetch,
  }
}

export function useConnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (integration: Integration) => {
      const callbackURL = window.location.href
      // Trigger Better-Auth link account OAuth flow
      const res = await authClient.linkSocial({
        provider: integration.providerId as any,
        callbackURL,
      })
      return res
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "connected-accounts"] })
    },
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (providerId: string) => {
      const authUrl = import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
      const res = await fetch(`${authUrl}/api/auth/unlink-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to disconnect integration")
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "connected-accounts"] })
    },
  })
}
