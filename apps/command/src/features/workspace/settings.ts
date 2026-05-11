export const defaultWorkspaceSettingsTab = "general"

export const workspaceSettingsTabs = [
  {
    value: defaultWorkspaceSettingsTab,
    label: "General",
    to: "/settings",
    title: "General",
    description:
      "Workspace identity, regional defaults, and access preferences.",
  },
  {
    value: "members",
    label: "Members",
    to: "/settings/$tab",
    title: "Members",
    description: "Invite teammates, review roles, and manage workspace access.",
  },
  {
    value: "billing",
    label: "Billing",
    to: "/settings/$tab",
    title: "Billing",
    description: "Review plan details, invoices, and payment preferences.",
  },
  {
    value: "api-keys",
    label: "API keys",
    to: "/settings/$tab",
    title: "API keys",
    description: "Create and rotate keys for workspace integrations.",
  },
] as const

export const workspaceSettingsParamTabs = workspaceSettingsTabs.filter(
  (tab) => tab.value !== defaultWorkspaceSettingsTab
)

export type WorkspaceSettingsTab =
  (typeof workspaceSettingsTabs)[number]["value"]
export type WorkspaceSettingsParamTab =
  (typeof workspaceSettingsParamTabs)[number]["value"]
export type WorkspaceSettingsTabItem = (typeof workspaceSettingsTabs)[number]

export function isWorkspaceSettingsTab(
  value: string | undefined
): value is WorkspaceSettingsTab {
  return workspaceSettingsTabs.some((tab) => tab.value === value)
}

export function isWorkspaceSettingsParamTab(
  value: string | undefined
): value is WorkspaceSettingsParamTab {
  return workspaceSettingsParamTabs.some((tab) => tab.value === value)
}

export function getWorkspaceSettingsTab(
  value: string | undefined
): WorkspaceSettingsTabItem {
  return (
    workspaceSettingsTabs.find((tab) => tab.value === value) ??
    workspaceSettingsTabs[0]
  )
}
