import {
  Activity01Icon,
  CompassIcon,
  Folder01Icon,
  Home01Icon,
  InboxIcon,
  Layers01Icon,
  Notification01Icon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

export type WorkspaceRouteNavItem = {
  label: string
  to: "/" | "/settings"
  icon: IconSvgElement
  badge?: number
}

export type WorkspaceActionNavItem = {
  label: string
  icon: IconSvgElement
  badge?: number
  to?: never
}

export type WorkspaceNavItem = WorkspaceRouteNavItem | WorkspaceActionNavItem

export type WorkspaceUserProfile = {
  name: string
  email: string
  initials: string
}

export type WorkspaceConfig = {
  primaryNav: Array<WorkspaceNavItem>
}

export const workspaceConfig = {
  primaryNav: [
    { icon: Home01Icon, label: "Home", to: "/" },
    { icon: InboxIcon, label: "Inbox", badge: 4 },
    { icon: Notification01Icon, label: "Activity" },
    { icon: Layers01Icon, label: "Projects" },
    { icon: UserGroupIcon, label: "People" },
    { icon: CompassIcon, label: "Discover" },
    { icon: Settings01Icon, label: "Settings", to: "/settings" },
  ],
} satisfies WorkspaceConfig

export const workspaceStats = [
  {
    label: "Open projects",
    value: "12",
    detail: "3 moving this week",
    icon: Folder01Icon,
  },
  {
    label: "Unread inbox",
    value: "4",
    detail: "Needs triage",
    icon: InboxIcon,
  },
  {
    label: "Activity",
    value: "18",
    detail: "Across teams",
    icon: Activity01Icon,
  },
] satisfies Array<{
  label: string
  value: string
  detail: string
  icon: IconSvgElement
}>
