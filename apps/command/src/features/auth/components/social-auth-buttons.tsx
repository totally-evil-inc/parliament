import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  SUPPORTED_OAUTH_PROVIDERS,
  SUPPORTED_OAUTH_PROVIDER_DETAILS,
} from "../lib/o-auth-providers"
import type { SupportedOAuthProvider } from "../lib/o-auth-providers"
import { authClient } from "@/lib/auth-client"

export function SocialAuthButtons() {
  const [isPending, setIsPending] = useState(false)

  const signIn = async (provider: SupportedOAuthProvider) => {
    setIsPending(true)
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {SUPPORTED_OAUTH_PROVIDERS.map((provider) => {
        const { name, Icon } = SUPPORTED_OAUTH_PROVIDER_DETAILS[provider]

        return (
          <Button
            key={provider}
            variant="outline"
            size="lg"
            type="button"
            disabled={isPending}
            onClick={() => void signIn(provider)}
          >
            <Icon />
            Continue with {name}
          </Button>
        )
      })}
    </div>
  )
}
