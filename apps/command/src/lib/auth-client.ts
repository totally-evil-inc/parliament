import { magicLinkClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

let lastAuthRequestId: string | null = null

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
  plugins: [organizationClient(), magicLinkClient()],
  fetchOptions: {
    onRequest: (request) => {
      request.headers.set("x-request-id", crypto.randomUUID())
    },
    onResponse: ({ response }) => {
      lastAuthRequestId = response.headers.get("x-request-id")
    },
  },
})

export function getLastAuthRequestId() {
  return lastAuthRequestId
}
