import { useQuery } from "@tanstack/react-query"

export interface AIModelItem {
  id: string
  name: string
  provider?: string
}

export interface AIModelsResponse {
  defaultModel: string
  models: AIModelItem[]
}

function getAuthUrl(): string {
  return import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:4000"
}

export function useAIModels() {
  const authUrl = getAuthUrl()
  return useQuery<AIModelsResponse>({
    queryKey: ["agent", "models"],
    queryFn: async () => {
      const res = await fetch(`${authUrl}/api/agent/models`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error("Failed to fetch models list")
      }
      return res.json()
    },
    staleTime: 30_000,
  })
}
