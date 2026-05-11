import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { inviteSchema } from "../schema"

export function InviteStep({
  invitees,
  pending,
  onAdd,
  onRemove,
  onContinue,
  onBack,
}: {
  invitees: Array<string>
  pending: boolean
  onAdd: (email: string) => void
  onRemove: (email: string) => void
  onContinue: () => void | Promise<void>
  onBack: () => void
}) {
  const [sending, setSending] = useState(false)
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: zodFieldValidator(inviteSchema),
    },
    onSubmit: ({ value, formApi }) => {
      onAdd(value.email)
      formApi.reset()
    },
  })

  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Bring people with you
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Invite teammates
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Optional. You can add anyone later.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-8 flex items-start gap-2"
      >
        <form.Field name="email">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="min-w-0 flex-1">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  autoComplete="off"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "invite-email-error" : undefined}
                />
                {error ? (
                  <p
                    id="invite-email-error"
                    className="mt-1.5 text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>
        <Button type="submit" variant="outline">
          Add
        </Button>
      </form>

      {invitees.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-1.5">
          {invitees.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between rounded-md border border-border/70 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground/85">{email}</span>
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-border/70 bg-background/30 px-3 py-6 text-center text-xs text-muted-foreground">
          No invites yet. Add a few or skip.
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending || sending}
          onClick={async () => {
            setSending(true)
            await onContinue()
            setSending(false)
          }}
        >
          {sending
            ? "Sending..."
            : invitees.length === 0
              ? "Skip for now"
              : `Send ${invitees.length} invite${invitees.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </>
  )
}
