import { createAuthClient } from "better-auth/client"
import { emailOTPClient } from "better-auth/client/plugins"

export function getAuthServerUrl(): string {
  return (
    (import.meta.env.VITE_AUTH_SERVER_URL as string | undefined) ||
    "http://localhost:4000"
  ).replace(/\/$/, "")
}

export const gateAuthClient = createAuthClient({
  baseURL: getAuthServerUrl(),
  plugins: [emailOTPClient()],
})
