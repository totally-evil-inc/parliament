import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"

export type WorkspaceOrganization = {
  id: string
  name: string
  slug: string
}

type WorkspaceContextValue = {
  activeOrg: WorkspaceOrganization | null
  organizations: Array<WorkspaceOrganization>
  isSwitching: boolean
  switchOrganization: (organizationId: string) => Promise<void>
  refreshWorkspaceState: () => Promise<void>
}

type WorkspaceProviderProps = {
  children: ReactNode
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeOrgResult = authClient.useActiveOrganization()
  const persistedActiveOrg = activeOrgResult.data
  const refetchActiveOrg =
    "refetch" in activeOrgResult && typeof activeOrgResult.refetch === "function"
      ? activeOrgResult.refetch
      : undefined
  const [activeOrg, setActiveOrg] = useState<WorkspaceOrganization | null>(
    () => toWorkspaceOrg(persistedActiveOrg)
  )
  const [isSwitching, setIsSwitching] = useState(false)

  const { data: organizations = [], refetch: refetchOrganizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const result = await authClient.organization.list()
      return (result.data ?? [])
        .map(toWorkspaceOrg)
        .filter(isWorkspaceOrganization)
    },
  })

  useEffect(() => {
    setActiveOrg(toWorkspaceOrg(persistedActiveOrg))
  }, [persistedActiveOrg])

  const invalidateOrgScopedState = useCallback(async () => {
    await Promise.all([
      router.invalidate(),
      queryClient.invalidateQueries({ queryKey: ["org-members"] }),
      queryClient.invalidateQueries({ queryKey: ["org-invitations"] }),
    ])
  }, [queryClient, router])

  const refreshActiveOrganization = useCallback(async () => {
    if (refetchActiveOrg) {
      await refetchActiveOrg()
    }
  }, [refetchActiveOrg])

  const refreshWorkspaceState = useCallback(async () => {
    await Promise.all([
      refreshActiveOrganization(),
      refetchOrganizations(),
      invalidateOrgScopedState(),
    ])
  }, [invalidateOrgScopedState, refetchOrganizations, refreshActiveOrganization])

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (organizationId === activeOrg?.id) return

      const previousActiveOrg = activeOrg
      let nextActiveOrg =
        organizations.find((org) => org.id === organizationId) ?? null

      if (!nextActiveOrg) {
        const result = await refetchOrganizations()
        nextActiveOrg =
          result.data?.find((org) => org.id === organizationId) ?? null
      }

      if (nextActiveOrg) {
        setActiveOrg(nextActiveOrg)
      }

      setIsSwitching(true)

      try {
        await authClient.organization.setActive({ organizationId })
        await invalidateOrgScopedState()
        await refreshActiveOrganization()
      } catch (error) {
        setActiveOrg(previousActiveOrg)
        throw error
      } finally {
        setIsSwitching(false)
      }
    },
    [
      activeOrg,
      invalidateOrgScopedState,
      organizations,
      refetchOrganizations,
      refreshActiveOrganization,
    ]
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeOrg,
      organizations,
      isSwitching,
      switchOrganization,
      refreshWorkspaceState,
    }),
    [
      activeOrg,
      organizations,
      isSwitching,
      switchOrganization,
      refreshWorkspaceState,
    ]
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider")
  }

  return context
}

function toWorkspaceOrg(
  org: { id: string; name: string; slug: string } | null | undefined
) {
  if (!org) return null
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
  }
}

function isWorkspaceOrganization(
  org: WorkspaceOrganization | null
): org is WorkspaceOrganization {
  return org !== null
}
