import { useMemo } from "react"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { signUpSchema } from "../schema"
import { authClient } from "@/lib/auth-client"
import { AuthSeparator } from "../../components/auth-separator"
import { AuthTextField } from "../../components/auth-text-field"
import { GoogleIcon, AppleIcon } from "../../components/social-icons"

export function AccountStep({
  pending,
  onAuthenticated,
  onBack,
  onError,
}: {
  pending: boolean
  onAuthenticated: () => void | Promise<void>
  onBack: () => void
  onError: (message: string | null) => void
}) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Account
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use email and password, or continue with a social provider.
      </p>

      <SignUpForm
        pending={pending}
        onAuthenticated={onAuthenticated}
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

function SignUpForm({
  pending,
  onAuthenticated,
  onError,
}: {
  pending: boolean
  onAuthenticated: () => void | Promise<void>
  onError: (message: string | null) => void
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: zodFieldValidator(signUpSchema),
    },
    onSubmit: async ({ value }) => {
      onError(null)
      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email: value.email.trim().toLowerCase(),
        password: value.password,
      })

      if (error) {
        onError(error.message || "Could not create your account.")
        return
      }

      await onAuthenticated()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
      className="mt-6 flex flex-col gap-4"
    >
      <form.Field name="name">
        {(field) => (
          <AuthTextField
            id="sign-up-name"
            label="Name"
            autoComplete="name"
            value={field.state.value}
            error={fieldError(field.state.meta.errors)}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
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
      <form.Field name="password">
        {(field) => (
          <AuthTextField
            id="sign-up-password"
            label="Password"
            type="password"
            autoComplete="new-password"
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
            disabled={pending || !canSubmit}
            className="mt-2"
          >
            {pending ? "Working..." : "Create account"}
          </Button>
        )}
      </form.Subscribe>
    </form>
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
