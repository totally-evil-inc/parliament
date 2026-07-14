import type { ReactNode } from "react"
import { createContext, use, useCallback, useMemo, useState } from "react"
import { useWorkspace } from "@/layouts/workspace-provider"
import type { WorkspaceSettingsValues } from "./settings-form"

type SettingsContextValue = {
  draftSettings: WorkspaceSettingsValues
  dirty: boolean
  updateSetting: <TKey extends keyof WorkspaceSettingsValues>(
    key: TKey,
    value: WorkspaceSettingsValues[TKey]
  ) => void
  discardChanges: () => void
  saveChanges: () => void
}

type SettingsProviderProps = {
  children: ReactNode
}

const defaultSettings: WorkspaceSettingsValues = {
  name: "",
  slug: "",
  timezone: "utc+3",
  dateFormat: "ymd",
  publicSignup: true,
  adminTwoFactor: true,
  showProjectIds: false,
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { activeOrg } = useWorkspace()

  const initialSettings = useMemo<WorkspaceSettingsValues>(
    () => ({
      ...defaultSettings,
      name: activeOrg?.name ?? "",
      slug: activeOrg?.slug ?? "",
    }),
    [activeOrg?.name, activeOrg?.slug]
  )
  const activeOrgSignature = `${activeOrg?.id ?? ""}:${initialSettings.name}:${initialSettings.slug}`

  return (
    <SettingsStateProvider
      key={activeOrgSignature}
      initialSettings={initialSettings}
    >
      {children}
    </SettingsStateProvider>
  )
}

function SettingsStateProvider({
  children,
  initialSettings,
}: SettingsProviderProps & { initialSettings: WorkspaceSettingsValues }) {
  const [savedSettings, setSavedSettings] = useState(initialSettings)
  const [draftSettings, setDraftSettings] = useState(initialSettings)

  const dirty = !settingsEqual(draftSettings, savedSettings)

  const updateSetting = useCallback(
    <TKey extends keyof WorkspaceSettingsValues>(
      key: TKey,
      value: WorkspaceSettingsValues[TKey]
    ) => {
      setDraftSettings((current) => ({
        ...current,
        [key]: value,
      }))
    },
    []
  )

  const discardChanges = useCallback(() => {
    setDraftSettings(savedSettings)
  }, [savedSettings])

  const saveChanges = useCallback(() => {
    setSavedSettings(draftSettings)
  }, [draftSettings])

  const value = useMemo<SettingsContextValue>(
    () => ({
      draftSettings,
      dirty,
      updateSetting,
      discardChanges,
      saveChanges,
    }),
    [dirty, discardChanges, draftSettings, saveChanges, updateSetting]
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  const context = use(SettingsContext)

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider")
  }

  return context
}

function settingsEqual(
  first: WorkspaceSettingsValues,
  second: WorkspaceSettingsValues
) {
  return (
    first.name === second.name &&
    first.slug === second.slug &&
    first.timezone === second.timezone &&
    first.dateFormat === second.dateFormat &&
    first.publicSignup === second.publicSignup &&
    first.adminTwoFactor === second.adminTwoFactor &&
    first.showProjectIds === second.showProjectIds
  )
}
