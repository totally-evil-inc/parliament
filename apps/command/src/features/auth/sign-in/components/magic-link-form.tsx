import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { Label } from "@workspace/ui/components/label"
import { useState } from "react"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { signInSchema } from "@/utils/auth-schemas"

export function MagicLinkForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
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

      setPending(true)
      setServerError(null)
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
            callbackURL: window.location.origin + "/",
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to request sign-in link")
        }

        setSentTo(email)
      } catch (err: any) {
        setServerError(err.message)
      } finally {
        setPending(false)
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
        className="mt-8 flex flex-col gap-4"
      >
        <form.Field name="email">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-in-email">Email</Label>
                <Input
                  id="sign-in-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "sign-in-email-error" : undefined}
                />
                {error ? (
                  <p
                    id="sign-in-email-error"
                    className="text-destructive text-xs"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>

        {serverError ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs"
            role="alert"
          >
            {serverError}
          </p>
        ) : null}

        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              size="lg"
              disabled={pending || !canSubmit}
              className="mt-2"
            >
              {pending ? "Sending..." : "Send sign-in link"}
            </Button>
          )}
        </form.Subscribe>
        {!sentTo ? (
          <p className="text-center text-muted-foreground text-xs">
            <Kbd className="font-mono">⌘↵</Kbd> to submit
          </p>
        ) : null}
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
