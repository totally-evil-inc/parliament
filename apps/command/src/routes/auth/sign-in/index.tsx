import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { AuthSeparator } from "@/features/auth/components/auth-separator"
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons"
import { MagicLinkForm } from "@/features/auth/sign-in/components/magic-link-form"

const searchSchema = z.object({
  error: z.string().optional(),
})

export const Route = createFileRoute("/auth/sign-in/")({
  validateSearch: searchSchema,
  component: SignInPage,
})

function SignInPage() {
  const { error } = Route.useSearch()

  const errorMessage = error
    ? (() => {
        switch (error) {
          case "invalid_or_expired_invitation":
            return "This invitation link is invalid or has expired."
          case "invitation_not_found_or_already_accepted":
            return "This invitation was not found or has already been accepted."
          case "invalid_or_expired_token":
            return "Your magic link is invalid or has expired."
          case "missing_token_or_email":
            return "Invalid sign-in request details."
          default:
            return "An error occurred during authentication."
        }
      })()
    : null

  return (
    <>
      <div className="absolute top-6 left-6 flex items-center gap-2 font-mono text-sm lg:hidden">
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        <span className="uppercase tracking-[0.2em]">
          Sean&apos;s scratch pad
        </span>
      </div>

      <div className="w-full max-w-lg">
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
          Welcome back
        </div>
        <h1 className="mt-2 font-heading text-3xl leading-tight">
          Enter your command center
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Sign in to continue.
        </p>

        {errorMessage ? (
          <p
            className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <MagicLinkForm />
        <AuthSeparator />
        <SocialAuthButtons />
      </div>
    </>
  )
}
