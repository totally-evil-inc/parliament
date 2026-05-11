import { WorkspaceSettingsActions } from "@/features/workspace/components/workspace-settings-actions"
import { useWorkspaceSettings } from "@/features/workspace/components/workspace-settings-context"
import { WorkspaceSettingsForm } from "@/features/workspace/components/workspace-settings-form"

export function WorkspaceSettingsGeneral() {
  const { draftSettings, dirty, updateSetting, discardChanges, saveChanges } =
    useWorkspaceSettings()

  return (
    <>
      <WorkspaceSettingsForm values={draftSettings} onChange={updateSetting} />
      <WorkspaceSettingsActions
        dirty={dirty}
        onDiscard={discardChanges}
        onSave={saveChanges}
      />
    </>
  )
}
