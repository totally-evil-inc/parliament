import { useEffect, useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { z } from "zod"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_IDS,
} from "@/features/auth/onboarding/constants"
import {
  inviteSchema,
  organizationSchema,
  signUpSchema,
} from "@/features/auth/onboarding/schema"
import { authClient } from "@/lib/auth-client"

type OnboardingStep = (typeof ONBOARDING_STEP_IDS)[number]

type OrganizationDraft = {
  organizationName: string
  organizationSlug: string
  organizationId?: string
}

const DRAFT_KEY = "command:onboarding-draft:v1"

const searchSchema = z.object({
  step: z.enum(ONBOARDING_STEP_IDS).catch("organization"),
})

export const Route = createFileRoute("/auth/onboarding/")({
  validateSearch: searchSchema,
  component: OnboardingPage,
})

function OnboardingPage() {
  return <OnboardingFlow />
}

function OnboardingFlow() {
  const { step } = Route.useSearch()
  const navigate = useNavigate({ from: "/auth/onboarding/" })
  const session = authClient.useSession()
  const [draft, setDraftState] = useState<OrganizationDraft | null>(() =>
    readDraft()
  )
  const [invitees, setInvitees] = useState<Array<string>>([])
  const [status, setStatus] = useState<string | null>(null)
  const [pendingOrganization, setPendingOrganization] = useState(false)

  const currentStepIndex = ONBOARDING_STEP_IDS.indexOf(step)
  const isAuthenticated = !!session.data?.user

  const goToStep = (nextStep: OnboardingStep) => {
    void navigate({ search: { step: nextStep } })
  }

  const setDraft = (nextDraft: OrganizationDraft | null) => {
    setDraftState(nextDraft)
    writeDraft(nextDraft)
  }

  const createOrganization = async (nextDraft = draft) => {
    if (!nextDraft) {
      goToStep("organization")
      return null
    }

    if (nextDraft.organizationId) {
      return nextDraft
    }

    setPendingOrganization(true)
    setStatus(null)

    const { data, error } = await authClient.organization.create({
      name: nextDraft.organizationName,
      slug: nextDraft.organizationSlug,
    })

    setPendingOrganization(false)

    if (error) {
      const message =
        error.message || "We could not create that organization yet."
      setStatus(message)
      goToStep("organization")
      return null
    }

    const savedDraft = {
      ...nextDraft,
      organizationId: data.id,
    }
    setDraft(savedDraft)
    return savedDraft
  }

  useEffect(() => {
    if (session.isPending || pendingOrganization) return

    if (step === "account" && isAuthenticated) {
      void createOrganization().then((savedDraft) => {
        if (savedDraft) goToStep("invites")
      })
      return
    }

    if ((step === "account" || step === "invites") && !draft) {
      goToStep("organization")
      return
    }

    if (step === "invites" && !isAuthenticated) {
      goToStep("account")
    }
  }, [draft, isAuthenticated, pendingOrganization, session.isPending, step])

  return (
    <div className="w-full max-w-lg">
      <Stepper step={currentStepIndex} />
      {status ? (
        <div className="mt-5 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {status}
        </div>
      ) : null}

      {step === "organization" ? (
        <OrganizationStep
          draft={draft}
          pending={pendingOrganization}
          onSubmit={async (nextDraft) => {
            setDraft(nextDraft)

            if (!isAuthenticated) {
              goToStep("account")
              return
            }

            const savedDraft = await createOrganization(nextDraft)
            if (savedDraft) goToStep("invites")
          }}
        />
      ) : null}

      {step === "account" ? (
        <AccountStep
          pending={pendingOrganization || session.isPending}
          onAuthenticated={async () => {
            await session.refetch()
            const savedDraft = await createOrganization()
            if (savedDraft) goToStep("invites")
          }}
          onBack={() => goToStep("organization")}
          onError={setStatus}
        />
      ) : null}

      {step === "invites" ? (
        <InviteStep
          invitees={invitees}
          pending={!draft?.organizationId}
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
          onContinue={async () => {
            if (!draft?.organizationId) return

            setStatus(null)

            for (const email of invitees) {
              const { error } = await authClient.organization.inviteMember({
                email,
                role: "member",
                organizationId: draft.organizationId,
              })

              if (error) {
                setStatus(error.message || `Could not invite ${email}.`)
                return
              }
            }

            goToStep("ready")
          }}
          onBack={() => goToStep("organization")}
        />
      ) : null}

      {step === "ready" ? (
        <ReadyStep
          organization={draft?.organizationName || "Untitled"}
          count={invitees.length}
          onEnter={() => {
            setDraft(null)
            window.location.assign("/")
          }}
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

function OrganizationStep({
  draft,
  pending,
  onSubmit,
}: {
  draft: OrganizationDraft | null
  pending: boolean
  onSubmit: (draft: OrganizationDraft) => void | Promise<void>
}) {
  const form = useForm({
    defaultValues: {
      organizationName: draft?.organizationName ?? "",
      organizationSlug: draft?.organizationSlug ?? "",
    },
    validators: {
      onChange: zodFieldValidator(organizationSchema),
      onSubmit: zodFieldValidator(organizationSchema),
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        organizationName: value.organizationName.trim(),
        organizationSlug: value.organizationSlug.trim(),
      })
    },
  })

  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Organization basics
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Name your organization
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The slug is required and can be edited before setup continues.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <form.Field name="organizationName">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-organization">
                  Organization name
                </Label>
                <Input
                  id="onboarding-organization"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    const slugField = form.getFieldValue("organizationSlug")

                    if (!slugField.trim()) {
                      form.setFieldValue(
                        "organizationSlug",
                        slugify(e.target.value)
                      )
                    }
                  }}
                  aria-invalid={!!error}
                  aria-describedby={
                    error ? "onboarding-organization-error" : undefined
                  }
                />
                {error ? (
                  <p
                    id="onboarding-organization-error"
                    className="text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>

        <form.Field name="organizationSlug">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-slug">Organization slug</Label>
                <Input
                  id="onboarding-slug"
                  placeholder="acme-inc"
                  autoComplete="off"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(slugify(e.target.value))}
                  aria-invalid={!!error}
                  aria-describedby={error ? "onboarding-slug-error" : undefined}
                />
                {error ? (
                  <p
                    id="onboarding-slug-error"
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
            values: state.values,
          })}
        >
          {({ canSubmit, values }) => (
            <Button
              type="submit"
              size="lg"
              disabled={
                pending ||
                !canSubmit ||
                !values.organizationName.trim() ||
                !values.organizationSlug.trim()
              }
              className="mt-2"
            >
              {pending ? "Creating..." : "Continue"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  )
}

function AccountStep({
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

      <OrSeparator />
      <OAuthButtons onError={onError} />

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
          <TextField
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
          <TextField
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
          <TextField
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

function TextField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  error,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  value: string
  error?: string
  onBlur: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
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

function OAuthButtons({
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

function InviteStep({
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

function ReadyStep({
  organization,
  count,
  onEnter,
}: {
  organization: string
  count: number
  onEnter: () => void
}) {
  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        You're set
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Welcome to {organization}.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {count === 0
          ? "Quiet for now. Invite people from settings when you're ready."
          : `We've sent ${count} invite${count === 1 ? "" : "s"}. They'll show up once accepted.`}
      </p>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <FactCard label="Organization" value={organization} />
        <FactCard label="Members" value={String(count + 1)} />
        <FactCard label="Plan" value="Free" />
      </div>

      <Button size="lg" className="mt-8 w-full" type="button" onClick={onEnter}>
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

function readDraft() {
  if (typeof window === "undefined") return null

  const raw = window.sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationDraft>

    if (!parsed.organizationName || !parsed.organizationSlug) return null

    return {
      organizationName: parsed.organizationName,
      organizationSlug: parsed.organizationSlug,
      organizationId: parsed.organizationId,
    }
  } catch {
    return null
  }
}

function writeDraft(draft: OrganizationDraft | null) {
  if (typeof window === "undefined") return

  if (!draft) {
    window.sessionStorage.removeItem(DRAFT_KEY)
    return
  }

  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
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
