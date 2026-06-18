import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { OrganizationDraft } from "@/features/auth/onboarding/onboarding-draft"
import { ONBOARDING_STEP_IDS } from "@/features/auth/onboarding/constants"
import {
  readDraft,
  writeDraft,
} from "@/features/auth/onboarding/onboarding-draft"
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

  const goToStep = useCallback(
    (nextStep: OnboardingStep) => {
      void navigate({ search: { step: nextStep } })
    },
    [navigate]
  )

  const setDraft = useCallback((nextDraft: OrganizationDraft | null) => {
    setDraftState(nextDraft)
    writeDraft(nextDraft)
  }, [])

  const createOrganization = useCallback(
    async (nextDraft = draft) => {
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
    },
    [draft, goToStep, setDraft]
  )

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

    const results = await Promise.all(
      invitees.map(async (email) => ({
        email,
        result: await authClient.organization.inviteMember({
          email,
          role: "member",
          organizationId: draft.organizationId,
        }),
      }))
    )

    const failedInvite = results.find(({ result }) => result.error)

    if (failedInvite) {
      setStatus(
        failedInvite.result.error?.message ||
          `Could not invite ${failedInvite.email}.`
      )
      return
    }

    goToStep("ready")
  }

  useEffect(() => {
    if (session.isPending || pendingOrganization) return

    if ((step === "account" || step === "invites") && !draft) {
      goToStep("organization")
      return
    }

    if (step === "invites" && !isAuthenticated) {
      goToStep("account")
    }
  }, [
    draft,
    goToStep,
    isAuthenticated,
    pendingOrganization,
    session.isPending,
    step,
  ])

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
