import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { authClient } from "@/lib/auth-client"
import type { Integration } from "./data"
import { DEFAULT_INTEGRATIONS } from "./data"
import {
  getConnectedAccount,
  isIntegrationConnected,
  SUPPORTED_INTEGRATIONS,
} from "./provider-mapping"

export { isIntegrationConnected }

export const connectedAccountSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  accountId: z.string(),
  createdAt: z.string().optional().default(""),
  updatedAt: z.string().optional().default(""),
})

export const connectedAccountsResponseSchema = z.object({
  accounts: z.array(connectedAccountSchema).optional().default([]),
})

export type ConnectedAccount = z.infer<typeof connectedAccountSchema>

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
  const parsed = connectedAccountsResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(
      "Received malformed connected accounts response from auth service"
    )
  }
  return parsed.data.accounts
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

    const connectedAccount = getConnectedAccount(accounts, item.providerId)
    const isConnected = !!connectedAccount

    return {
      ...item,
      status: isConnected ? "connected" : "available",
      providerAccountId: connectedAccount?.accountId,
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
      if (res?.error) {
        throw new Error(res.error.message || "Failed to connect integration")
      }
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["integrations", "connected-accounts"],
      })
    },
  })
}

export type DisconnectIntegrationInput = {
  providerId: string
  accountId?: string
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DisconnectIntegrationInput | string) => {
      const providerId =
        typeof input === "string" ? input.trim() : input.providerId?.trim()
      const accountId =
        typeof input === "object" && input.accountId
          ? input.accountId.trim()
          : undefined

      if (!providerId) {
        throw new Error("Invalid provider identifier for unlinking")
      }

      // Use Better Auth's standard account unlinking API
      const res = await authClient.unlinkAccount({
        providerId,
        ...(accountId ? { accountId } : {}),
      })
      if (res?.error) {
        throw new Error(res.error.message || "Failed to disconnect integration")
      }
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["integrations", "connected-accounts"],
      })
    },
  })
}
