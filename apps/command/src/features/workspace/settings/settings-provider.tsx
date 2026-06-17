import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import type { WorkspaceSettingsValues } from "./settings-form"
import { authClient } from "@/lib/auth-client"

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
  const { data: activeOrg } = authClient.useActiveOrganization()

  const initialSettings: WorkspaceSettingsValues = {
    ...defaultSettings,
    name: activeOrg?.name ?? "",
    slug: activeOrg?.slug ?? "",
  }

  const [savedSettings, setSavedSettings] = useState<WorkspaceSettingsValues>(
    () => initialSettings
  )
  const [draftSettings, setDraftSettings] = useState<WorkspaceSettingsValues>(
    () => initialSettings
  )

  const dirty = !settingsEqual(draftSettings, savedSettings)

  function updateSetting<TKey extends keyof WorkspaceSettingsValues>(
    key: TKey,
    value: WorkspaceSettingsValues[TKey]
  ) {
    setDraftSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function discardChanges() {
    setDraftSettings(savedSettings)
  }

  function saveChanges() {
    setSavedSettings(draftSettings)
  }

  return (
    <SettingsContext
      value={{
        draftSettings,
        dirty,
        updateSetting,
        discardChanges,
        saveChanges,
      }}
    >
      {children}
    </SettingsContext>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)

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
