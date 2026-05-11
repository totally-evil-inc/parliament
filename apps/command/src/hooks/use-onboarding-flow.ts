import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ONBOARDING_STEP_IDS } from "@/features/auth/onboarding/constants"
import { type OrganizationDraft, readDraft, writeDraft } from "@/features/auth/onboarding/onboarding-draft"
import { authClient } from "@/lib/auth-client"

export type OnboardingStep = (typeof ONBOARDING_STEP_IDS)[number]

export function useOnboardingFlow(step: OnboardingStep) {
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

  const addInvitee = (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (invitees.includes(trimmed)) return
    setInvitees((prev) => [...prev, trimmed])
  }

  const removeInvitee = (email: string) => {
    setInvitees((prev) => prev.filter((e) => e !== email))
  }

  const submitInvites = async () => {
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

  return {
    step,
    currentStepIndex,
    status,
    setStatus,
    draft,
    setDraft,
    invitees,
    pendingOrganization,
    isAuthenticated,
    session,
    goToStep,
    createOrganization,
    addInvitee,
    removeInvitee,
    submitInvites,
  }
}
