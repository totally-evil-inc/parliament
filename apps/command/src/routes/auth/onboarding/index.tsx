import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { getSession } from "@/server/auth"
import { ONBOARDING_STEP_IDS } from "@/features/auth/onboarding/constants"
import { useOnboardingFlow } from "@/hooks/use-onboarding-flow"
import { Stepper } from "@/features/auth/onboarding/components/stepper"
import { OrganizationStep } from "@/features/auth/onboarding/components/organization-step"
import { AccountStep } from "@/features/auth/onboarding/components/account-step"
import { InviteStep } from "@/features/auth/onboarding/components/invite-step"
import { ReadyStep } from "@/features/auth/onboarding/components/ready-step"

const searchSchema = z.object({
  step: z.enum(ONBOARDING_STEP_IDS).catch("organization"),
})

export const Route = createFileRoute("/auth/onboarding/")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await getSession()

    if (session?.session?.activeOrganizationId) {
      throw redirect({ to: "/" })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { step } = Route.useSearch()
  const {
    currentStepIndex,
    status,
    setStatus,
    draft,
    setDraft,
    pendingOrganization,
    isAuthenticated,
    session,
    goToStep,
    createOrganization,
  } = useOnboardingFlow(step)

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

      {step === "invites" && draft?.organizationId ? (
        <InviteStep
          organizationId={draft.organizationId}
          onSuccess={() => goToStep("ready")}
          onBack={() => goToStep("organization")}
        />
      ) : null}

      {step === "ready" ? (
        <ReadyStep
          organization={draft?.organizationName || "Untitled"}
          count={0}
          onEnter={() => {
            setDraft(null)
            window.location.assign("/")
          }}
        />
      ) : null}
    </div>
  )
}
