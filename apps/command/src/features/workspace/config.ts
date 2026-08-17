import {
  IconConnect,
  IconFile,
  IconFolder,
  IconGear,
  IconHouse,
  IconInbox,
  IconLayers,
  IconMoneyBill,
  IconRoadmap,
} from "nucleo-glass"
import type React from "react"

export type WorkspaceRouteNavItem = {
  label: string
  to:
    | "/"
    | "/integrations"
    | "/proposals"
    | "/invoices"
    | "/settings"
    | "/clients"
    | "/clients/deals"
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
    { icon: IconFolder, label: "Clients Directory", to: "/clients" },
    { icon: IconLayers, label: "Deals Pipeline", to: "/clients/deals" },
    { icon: IconFile, label: "Proposals", to: "/proposals" },
    { icon: IconMoneyBill, label: "Invoices", to: "/invoices" },
    { icon: IconConnect, label: "Integrations", to: "/integrations" },
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
