import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { ONBOARDING_STEPS } from "@/features/auth/onboarding/constants"
import {
  inviteSchema,
  workspaceSchema,
} from "@/features/auth/onboarding/schema"

export const Route = createFileRoute("/auth/onboarding/")({
  component: OnboardingPage,
})

function OnboardingPage() {
  return <OnboardingFlow />
}

function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [workspace, setWorkspace] = useState("")
  const [invitees, setInvitees] = useState<Array<string>>([])

  const next = () => {
    setStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1))
  }
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="w-full max-w-lg">
      <Stepper step={step} />

      {step === 0 ? (
        <WorkspaceStep
          value={workspace}
          onSubmit={(nextWorkspace) => {
            setWorkspace(nextWorkspace)
            next()
          }}
        />
      ) : null}

      {step === 1 ? (
        <InviteStep
          invitees={invitees}
          onAdd={(email) => {
            const trimmed = email.trim().toLowerCase()

            if (invitees.includes(trimmed)) {
              return
            }

            setInvitees((prev) => [...prev, trimmed])
          }}
          onRemove={(email) =>
            setInvitees((prev) => prev.filter((e) => e !== email))
          }
          onContinue={next}
          onBack={back}
        />
      ) : null}

      {step === 2 ? (
        <ReadyStep
          workspace={workspace || "Untitled"}
          count={invitees.length}
        />
      ) : null}
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
      <span>
        Step {String(step + 1).padStart(2, "0")} / {ONBOARDING_STEPS.length}
      </span>
      <div className="ml-2 flex items-center gap-1.5">
        {ONBOARDING_STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? "w-5 bg-foreground"
                : i < step
                  ? "w-1.5 bg-foreground/70"
                  : "w-1.5 bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function WorkspaceStep({
  value,
  onSubmit,
}: {
  value: string
  onSubmit: (workspace: string) => void
}) {
  const form = useForm({
    defaultValues: {
      workspace: value,
    },
    validators: {
      onChange: zodFieldValidator(workspaceSchema),
      onSubmit: zodFieldValidator(workspaceSchema),
    },
    onSubmit: ({ value: formValue }) => {
      onSubmit(formValue.workspace.trim())
    },
  })

  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Name your workspace
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        What are we calling it?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can change this later in settings.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <form.Field name="workspace">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-workspace">Workspace name</Label>
                <Input
                  id="onboarding-workspace"
                  placeholder="Acme inc."
                  autoComplete="off"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={
                    error ? "onboarding-workspace-error" : undefined
                  }
                />
                {error ? (
                  <p
                    id="onboarding-workspace-error"
                    className="text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            workspace: state.values.workspace,
          })}
        >
          {({ canSubmit, workspace }) => (
            <Button
              type="submit"
              size="lg"
              disabled={!workspace.trim() || !canSubmit}
              className="mt-2"
            >
              Continue
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  )
}

function InviteStep({
  invitees,
  onAdd,
  onRemove,
  onContinue,
  onBack,
}: {
  invitees: Array<string>
  onAdd: (email: string) => void
  onRemove: (email: string) => void
  onContinue: () => void
  onBack: () => void
}) {
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
        Optional — you can add anyone later.
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
          No invites yet. Add a few or skip — totally fine.
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="button" size="lg" onClick={onContinue}>
          {invitees.length === 0
            ? "Skip for now"
            : `Send ${invitees.length} invite${invitees.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </>
  )
}

function ReadyStep({ workspace, count }: { workspace: string; count: number }) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        You're set
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Welcome to {workspace}.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {count === 0
          ? "Quiet for now — when you're ready, invite people from settings."
          : `We've sent ${count} invite${count === 1 ? "" : "s"}. They'll show up here once accepted.`}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <FactCard label="Workspace" value={workspace} />
        <FactCard label="Members" value={String(count + 1)} />
        <FactCard label="Plan" value="Free" />
      </div>

      <Button size="lg" className="mt-8 w-full" type="button">
        Take me in
      </Button>
    </>
  )
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/40 px-3 py-3">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 truncate font-heading text-sm">{value}</div>
    </div>
  )
}
