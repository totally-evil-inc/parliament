import { IconBell, IconFile, IconFolder, IconGear, IconHouse, IconInbox, IconLayers, IconLink, IconRoadmap, IconUsers } from "nucleo-glass"
import type React from "react"

export type WorkspaceRouteNavItem = {
  label: string
  to: "/" | "/integrations" | "/proposals" | "/settings"
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export type WorkspaceActionNavItem = {
  label: string
  icon: React.ComponentType<{ className?: string }>
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
    { icon: IconHouse, label: "Home", to: "/" },
    { icon: IconInbox, label: "Inbox", badge: 4 },
    { icon: IconBell, label: "Activity" },
    { icon: IconLayers, label: "Projects" },
    { icon: IconUsers, label: "People" },
    { icon: IconFile, label: "Proposals", to: "/proposals" },
    { icon: IconLink, label: "Integrations", to: "/integrations" },
    { icon: IconGear, label: "Settings", to: "/settings" },
  ],
} satisfies WorkspaceConfig

export const workspaceStats = [
  {
    label: "Open projects",
    value: "12",
    detail: "3 moving this week",
    icon: IconFolder,
  },
  {
    label: "Unread inbox",
    value: "4",
    detail: "Needs triage",
    icon: IconInbox,
  },
  {
    label: "Activity",
    value: "18",
    detail: "Across teams",
    icon: IconRoadmap,
  },
] satisfies Array<{
  label: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
}>
