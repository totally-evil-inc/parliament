export const defaultWorkspaceSettingsTab = "general"

export const workspaceSettingsTabs = [
  {
    value: defaultWorkspaceSettingsTab,
    label: "General",
    title: "General",
    description:
      "Workspace identity, regional defaults, and access preferences.",
  },
  {
    value: "members",
    label: "Members",
    title: "Members",
    description: "Invite teammates, review roles, and manage workspace access.",
  },
  {
    value: "billing",
    label: "Billing",
    title: "Billing",
    description: "Review plan details, invoices, and payment preferences.",
  },
  {
    value: "api-keys",
    label: "API keys",
    title: "API keys",
    description: "Create and rotate keys for workspace integrations.",
  },
] as const

export type WorkspaceSettingsTab =
  (typeof workspaceSettingsTabs)[number]["value"]
export type WorkspaceSettingsTabItem = (typeof workspaceSettingsTabs)[number]

export function isWorkspaceSettingsTab(
  value: string | undefined
): value is WorkspaceSettingsTab {
  return workspaceSettingsTabs.some((tab) => tab.value === value)
}

export function getWorkspaceSettingsTab(
  value: WorkspaceSettingsTab
): WorkspaceSettingsTabItem {
  return (
    workspaceSettingsTabs.find((tab) => tab.value === value) ??
    workspaceSettingsTabs[0]
  )
}
