import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface AIProvider {
  id: string
  name: string
  isActive: boolean
  defaultModel: string
}

export interface AIProvidersResponse {
  providers: AIProvider[]
  activeProvider: AIProvider | null
}

function getAuthUrl(): string {
  return (
    import.meta.env.VITE_AUTH_SERVER_URL ||
    import.meta.env.VITE_BETTER_AUTH_URL ||
    "http://localhost:4000"
  )
}

export function useAIProviders() {
  const authUrl = getAuthUrl()
  return useQuery<AIProvidersResponse>({
    queryKey: ["agent", "settings", "ai"],
    queryFn: async () => {
      const response = await fetch(`${authUrl}/api/agent/settings/ai`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error(`Failed to load AI providers (HTTP ${response.status})`)
      }
      return response.json()
    },
    staleTime: 30_000,
  })
}

export function useSwitchAIProvider(options?: {
  onProviderSwitched?: (defaultModel?: string) => void
}) {
  const authUrl = getAuthUrl()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${authUrl}/api/agent/settings/ai/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })
      if (!response.ok) {
        throw new Error(
          `Failed to switch AI provider (HTTP ${response.status})`
        )
      }
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["agent", "settings", "ai"] })
      queryClient.invalidateQueries({ queryKey: ["agent", "models"] })
      const cached = queryClient.getQueryData<AIProvidersResponse>([
        "agent",
        "settings",
        "ai",
      ])
      const provider = cached?.providers.find((item) => item.id === id)
      options?.onProviderSwitched?.(provider?.defaultModel)
    },
  })
}
