import { SettingsActions } from "./settings-actions"
import { SettingsForm } from "./settings-form"
import { useSettings } from "./settings-provider"

export function GeneralSettings() {
  const { draftSettings, dirty, updateSetting, discardChanges, saveChanges } =
    useSettings()

  return (
    <>
      <SettingsForm values={draftSettings} onChange={updateSetting} />
      <SettingsActions
        dirty={dirty}
        onDiscard={discardChanges}
        onSave={saveChanges}
      />
    </>
  )
}
