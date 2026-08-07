import { createAuthClient } from "better-auth/client"
import { emailOTPClient } from "better-auth/client/plugins"

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`
  }
  return "http://localhost:4100/api/auth"
}

export const gateAuthClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [emailOTPClient()],
})
