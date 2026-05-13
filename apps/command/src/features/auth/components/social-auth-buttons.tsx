import { useMutation } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  SUPPORTED_OAUTH_PROVIDERS,
  SUPPORTED_OAUTH_PROVIDER_DETAILS,
} from "../lib/o-auth-providers"
import type { SupportedOAuthProvider } from "../lib/o-auth-providers"
import { authClient } from "@/lib/auth-client"

export function SocialAuthButtons() {
  const { mutate: signIn, isPending } = useMutation({
    mutationFn: async (provider: SupportedOAuthProvider) => {
      return await authClient.signIn.social({
        provider,
        callbackURL: "/",
      })
    },
  })

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
            onClick={() => signIn(provider)}
          >
            <Icon />
            Continue with {name}
          </Button>
        )
      })}
    </div>
  )
}
