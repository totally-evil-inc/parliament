import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { z } from "zod"

export const Route = createFileRoute("/auth/sign-in/")({
  component: SignInPage,
})

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
})

function zodFieldValidator<TValue>(schema: z.ZodType<TValue>) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)

    if (result.success) return undefined

    const fields: Record<string, string> = {}

    for (const issue of result.error.issues) {
      const fieldName = issue.path[0]

      if (typeof fieldName === "string") {
        fields[fieldName] = issue.message
      }
    }

    return Object.keys(fields).length > 0 ? { fields } : undefined
  }
}

function fieldError(errors: Array<unknown>) {
  const firstError = errors[0]

  if (!firstError) return undefined

  return typeof firstError === "string" ? firstError : String(firstError)
}

function SignInPage() {
  return (
    <>
      <div className="absolute top-6 left-6 flex items-center gap-2 font-mono text-sm lg:hidden">
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        <span className="tracking-[0.2em] uppercase">
          Sean&apos;s scratch pad
        </span>
      </div>

      <div className="w-full max-w-lg">
        <div className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
          Welcome back
        </div>
        <h1 className="mt-2 font-heading text-3xl leading-tight">
          Enter your orbit
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue.
        </p>

        <MagicLinkForm />
        <OrSeparator />
        <OAuthButtons />
      </div>
    </>
  )
}

function MagicLinkForm() {
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
                    className="text-xs text-destructive"
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
          <p className="text-center text-xs text-muted-foreground">
            <Kbd className="font-mono">⌘↵</Kbd> to submit
          </p>
        ) : null}
      </form>

      {sentTo ? (
        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
          Link sent to <span className="text-foreground">{sentTo}</span>. Open
          your inbox to continue.
        </div>
      ) : null}
    </>
  )
}

function OrSeparator() {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
        or
      </span>
      <Separator className="flex-1" />
    </div>
  )
}

function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="lg" type="button">
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button variant="outline" size="lg" type="button">
        <AppleIcon />
        Continue with Apple
      </Button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.64 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.84 0 3.07.78 3.77 1.45l2.57-2.5C16.71 3.8 14.59 2.9 12 2.9 6.97 2.9 2.9 6.97 2.9 12s4.07 9.1 9.1 9.1c5.26 0 8.74-3.69 8.74-8.89 0-.6-.06-1.05-.14-1.51Z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M16.37 1.43c.06 1.2-.39 2.37-1.17 3.2-.8.85-2.08 1.5-3.28 1.41-.09-1.19.5-2.37 1.21-3.13.8-.88 2.16-1.52 3.24-1.48ZM20.5 17.33c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.94-1-4.03-.99-2.1.01-2.54 1-4.08.98-1.73-.02-3.06-1.78-4.05-3.35-2.77-4.4-3.06-9.56-1.35-12.31 1.21-1.95 3.12-3.1 4.91-3.1 1.82 0 2.97.99 4.47.99 1.46 0 2.35-1 4.45-1 1.59 0 3.27.86 4.47 2.36-3.93 2.15-3.29 7.76 1.06 9.92Z"
      />
    </svg>
  )
}
