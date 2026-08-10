import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import { ONBOARDING_STEP_IDS } from "@/features/auth/onboarding/constants"
import type { OrganizationDraft } from "@/features/auth/onboarding/onboarding-draft"
import {
  readDraft,
  writeDraft,
} from "@/features/auth/onboarding/onboarding-draft"
import { authClient, getLastAuthRequestId } from "@/lib/auth-client"

function describeOrganizationError(error: unknown): string {
  const details = error as {
    message?: unknown
    code?: unknown
    status?: unknown
  }
  const message =
    typeof details?.message === "string" && details.message.trim()
      ? details.message.trim()
      : "The authentication service did not return a useful error."
  const status =
    typeof details?.status === "number" || typeof details?.status === "string"
      ? `HTTP ${details.status}`
      : null
  const code = typeof details?.code === "string" ? details.code : null
  const requestId = getLastAuthRequestId()
  const context = [status, code].filter(Boolean).join(" · ")
  const reference = requestId ? ` Reference: ${requestId}.` : ""

  if (/failed to fetch|network|fetch/i.test(message)) {
    return `The Auth service is unreachable. Confirm apps/auth is running on port 4000.${reference}`
  }

  return `Could not create the organization${context ? ` (${context})` : ""}: ${message}.${reference}`
}

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
        setStatus(describeOrganizationError(error))
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
    setInvitees((prev) =>
      trimmed && !prev.includes(trimmed) ? [...prev, trimmed] : prev
    )
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
      return
    }

    if (step === "account" && isAuthenticated && draft) {
      const autoCreate = async () => {
        const savedDraft = await createOrganization(draft)
        if (savedDraft) {
          goToStep("invites")
        }
      }
      void autoCreate()
    }
  }, [
    draft,
    goToStep,
    isAuthenticated,
    pendingOrganization,
    session.isPending,
    step,
    createOrganization,
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
