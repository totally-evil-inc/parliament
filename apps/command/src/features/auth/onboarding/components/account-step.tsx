import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { useMemo, useState } from "react"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { authClient } from "@/lib/auth-client"
import { signInSchema } from "@/utils/auth-schemas"
import { AuthSeparator } from "../../components/auth-separator"
import { AuthTextField } from "../../components/auth-text-field"
import { AppleIcon, GoogleIcon } from "../../components/social-icons"

export function AccountStep({
  pending,
  onBack,
  onError,
}: {
  pending: boolean
  onBack: () => void
  onError: (message: string | null) => void
}) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
        Account
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Authenticate your account
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Use a secure magic link, or continue with a social provider.
      </p>

      <OnboardingMagicLinkForm
        pending={pending}
        onError={onError}
      />

      <AuthSeparator />
      <OnboardingOAuthButtons onError={onError} />

      <Button variant="ghost" type="button" onClick={onBack} className="mt-6">
        Back
      </Button>
    </>
  )
}

function OnboardingMagicLinkForm({
  pending,
  onError,
}: {
  pending: boolean
  onError: (message: string | null) => void
}) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [requestPending, setRequestPending] = useState(false)
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: zodFieldValidator(signInSchema),
      onSubmit: zodFieldValidator(signInSchema),
    },
    onSubmit: async ({ value }) => {
      const email = value.email.trim().toLowerCase()

      setRequestPending(true)
      onError(null)
      try {
        const authUrl =
          import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:4000"
        const response = await fetch(`${authUrl}/auth/magic-link/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            callbackURL: window.location.origin + "/auth/onboarding/?step=account",
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to request sign-in link")
        }

        setSentTo(email)
      } catch (err: any) {
        onError(err.message)
      } finally {
        setRequestPending(false)
      }
    },
  })

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <form.Field name="email">
          {(field) => (
            <AuthTextField
              id="sign-up-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={field.state.value}
              error={fieldError(field.state.meta.errors)}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              size="lg"
              disabled={pending || requestPending || !canSubmit}
              className="mt-2"
            >
              {requestPending ? "Sending..." : "Send sign-in link"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {sentTo ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-muted-foreground text-sm">
          Link sent to <span className="text-foreground">{sentTo}</span>. Open
          your inbox to continue.
        </div>
      ) : null}
    </>
  )
}

function OnboardingOAuthButtons({
  onError,
}: {
  onError: (message: string | null) => void
}) {
  const callbackURL = useMemo(() => {
    if (typeof window === "undefined") return "/auth/onboarding/?step=account"
    return `${window.location.origin}/auth/onboarding/?step=account`
  }, [])

  const signInWithProvider = async (provider: "google" | "apple") => {
    onError(null)
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
    })

    if (error) {
      onError(error.message || `Could not continue with ${provider}.`)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={() => void signInWithProvider("google")}
      >
        <GoogleIcon />
        Google
      </Button>
      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={() => void signInWithProvider("apple")}
      >
        <AppleIcon />
        Apple
      </Button>
    </div>
  )
}
