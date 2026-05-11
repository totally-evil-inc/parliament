import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import type { WorkspaceSettingsValues } from "@/features/workspace/components/workspace-settings-form"
import { workspaceConfig } from "@/features/workspace/config"

type WorkspaceSettingsContextValue = {
  draftSettings: WorkspaceSettingsValues
  dirty: boolean
  updateSetting: <TKey extends keyof WorkspaceSettingsValues>(
    key: TKey,
    value: WorkspaceSettingsValues[TKey]
  ) => void
  discardChanges: () => void
  saveChanges: () => void
}

type WorkspaceSettingsProviderProps = {
  children: ReactNode
}

const initialSettings = {
  name: workspaceConfig.workspace.name,
  slug: "command",
  timezone: "utc+3",
  dateFormat: "ymd",
  publicSignup: true,
  adminTwoFactor: true,
  showProjectIds: false,
} satisfies WorkspaceSettingsValues

const WorkspaceSettingsContext =
  createContext<WorkspaceSettingsContextValue | null>(null)

export function WorkspaceSettingsProvider({
  children,
}: WorkspaceSettingsProviderProps) {
  const [savedSettings, setSavedSettings] =
    useState<WorkspaceSettingsValues>(initialSettings)
  const [draftSettings, setDraftSettings] =
    useState<WorkspaceSettingsValues>(initialSettings)

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
    <WorkspaceSettingsContext
      value={{
        draftSettings,
        dirty,
        updateSetting,
        discardChanges,
        saveChanges,
      }}
    >
      {children}
    </WorkspaceSettingsContext>
  )
}

export function useWorkspaceSettings() {
  const context = useContext(WorkspaceSettingsContext)

  if (!context) {
    throw new Error(
      "useWorkspaceSettings must be used inside WorkspaceSettingsProvider"
    )
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
