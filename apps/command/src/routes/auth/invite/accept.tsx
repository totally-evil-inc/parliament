import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useEffect, useState } from "react"
import { z } from "zod"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { authClient } from "@/lib/auth-client"
import { signInSchema } from "@/utils/auth-schemas"

const acceptInviteSearchSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  orgName: z.string().optional(),
})

export const Route = createFileRoute("/auth/invite/accept")({
  validateSearch: acceptInviteSearchSchema,
  component: AcceptInvitePage,
})

function AcceptInvitePage() {
  const { id, email: invitedEmail, orgName } = Route.useSearch()
  const navigate = useNavigate()
  const session = authClient.useSession()
  const [status, setStatus] = useState<
    | "loading"
    | "accepting"
    | "unauthenticated"
    | "email_mismatch"
    | "success"
    | "error"
  >("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sentMagicLinkTo, setSentMagicLinkTo] = useState<string | null>(null)

  const isAuthenticated = !!session.data?.user
  const currentUserEmail = session.data?.user?.email

  useEffect(() => {
    if (session.isPending) return

    if (!isAuthenticated) {
      setStatus("unauthenticated")
      return
    }

    if (
      invitedEmail &&
      currentUserEmail &&
      invitedEmail.trim().toLowerCase() !==
        currentUserEmail.trim().toLowerCase()
    ) {
      setStatus("email_mismatch")
      return
    }

    // Authenticated and email matches (or no email specified in query) -> Accept invitation programmatically!
    const accept = async () => {
      setStatus("accepting")
      const { error } = await authClient.organization.acceptInvitation({
        invitationId: id,
      })

      if (error) {
        setStatus("error")
        setErrorMsg(error.message || "Failed to accept the invitation.")
      } else {
        setStatus("success")
        // Redirect to homepage after 1.5 seconds via SPA router
        setTimeout(() => {
          void navigate({ to: "/" })
        }, 1500)
      }
    }

    void accept()
  }, [
    id,
    isAuthenticated,
    invitedEmail,
    currentUserEmail,
    session.isPending,
    navigate,
  ])

  const form = useForm({
    defaultValues: {
      email: invitedEmail || "",
    },
    validators: {
      onSubmit: zodFieldValidator(signInSchema),
    },
    onSubmit: async ({ value }) => {
      setErrorMsg(null)
      const email = value.email.trim().toLowerCase()
      try {
        const { error } = await authClient.signIn.magicLink({
          email,
          callbackURL: new URL(
            window.location.pathname + window.location.search,
            window.location.origin
          ).toString(),
        })
        if (error) throw new Error(error.message)
        setSentMagicLinkTo(email)
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to send magic link.")
      }
    },
  })

  return (
    <div className="w-full max-w-lg">
      <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
        Invitation
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Join {orgName || "Workspace"}
      </h1>

      {status === "loading" && (
        <p className="mt-4 text-muted-foreground text-sm">
          Checking your session...
        </p>
      )}

      {status === "accepting" && (
        <p className="mt-4 text-muted-foreground text-sm">
          Accepting invitation and joining workspace...
        </p>
      )}

      {status === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">
          Successfully joined! Redirecting you to the workspace...
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {errorMsg}
          </div>
          <Link to="/">
            <Button className="w-fit">Go to Dashboard</Button>
          </Link>
        </div>
      )}

      {status === "email_mismatch" && (
        <div className="mt-4 flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            You are currently signed in as{" "}
            <span className="text-foreground font-semibold">
              {currentUserEmail}
            </span>
            , but this invitation was sent to{" "}
            <span className="text-foreground font-semibold">
              {invitedEmail}
            </span>
            .
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await authClient.signOut()
                void navigate({ to: "/auth/onboarding" })
              }}
            >
              Sign Out
            </Button>
            <Link to="/">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            To accept this invitation, please authenticate below. We will send a
            secure magic link to sign you in.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
            className="flex flex-col gap-4"
          >
            <form.Field name="email">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="accept-email">Email</Label>
                  <Input
                    id="accept-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {fieldError(field.state.meta.errors) ? (
                    <p className="text-destructive text-xs">
                      {fieldError(field.state.meta.errors)}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>

            {errorMsg ? (
              <p
                className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs"
                role="alert"
              >
                {errorMsg}
              </p>
            ) : null}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="lg"
                  className="mt-2"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send magic link"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {sentMagicLinkTo ? (
            <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-muted-foreground text-sm">
              Link sent to{" "}
              <span className="text-foreground">{sentMagicLinkTo}</span>. Open
              your inbox to continue.
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
