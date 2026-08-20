import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import type { Integration } from "./data"
import { DEFAULT_INTEGRATIONS } from "./data"

import {
  isIntegrationConnected,
  SUPPORTED_INTEGRATIONS,
} from "./provider-mapping"

export type ConnectedAccount = {
  id: string
  providerId: string
  accountId: string
  createdAt: string
  updatedAt: string
}

function getAuthUrl(): string {
  return import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
}

async function fetchConnectedAccounts(): Promise<ConnectedAccount[]> {
  const authUrl = getAuthUrl()
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
  const {
    data: accounts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["integrations", "connected-accounts"],
    queryFn: fetchConnectedAccounts,
    staleTime: 10_000,
  })

  const mergedIntegrations: Integration[] = DEFAULT_INTEGRATIONS.map((item) => {
    const isSupported = (
      SUPPORTED_INTEGRATIONS as readonly string[]
    ).includes(item.providerId)

    if (!isSupported) {
      return {
        ...item,
        status: "coming_soon",
      }
    }

    const isConnected = isIntegrationConnected(accounts, item.providerId)

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
        provider: integration.providerId as Parameters<
          typeof authClient.linkSocial
        >[0]["provider"],
        callbackURL,
      })
      return res
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["integrations", "connected-accounts"],
      })
    },
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (providerId: string) => {
      const authUrl = getAuthUrl()
      const res = await fetch(`${authUrl}/api/auth/integrations/disconnect`, {
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
      void queryClient.invalidateQueries({
        queryKey: ["integrations", "connected-accounts"],
      })
    },
  })
}
