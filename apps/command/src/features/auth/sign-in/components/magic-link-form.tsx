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
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: zodFieldValidator(signInSchema),
      onSubmit: zodFieldValidator(signInSchema),
    },
    onSubmit: ({ value }) => {
      const email = value.email.trim().toLowerCase()

      setPending(true)
      window.setTimeout(() => {
        setSentTo(email)
        setPending(false)
      }, 600)
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
