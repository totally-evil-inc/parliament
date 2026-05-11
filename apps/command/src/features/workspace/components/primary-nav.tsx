import { Link, useRouterState } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import type { IconSvgElement } from "@hugeicons/react"
import type { WorkspaceNavItem } from "@/features/workspace/config"

export function PrimaryNav({ items }: { items: Array<WorkspaceNavItem> }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <SidebarGroup className="py-2">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              {item.to ? (
                <SidebarMenuButton
                  tooltip={item.label}
                  isActive={isActiveNavItem(item.to, pathname)}
                  render={<Link to={item.to} />}
                >
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton type="button" tooltip={item.label}>
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              )}
              {item.badge ? (
                <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function isActiveNavItem(to: string, pathname: string) {
  if (to === "/") {
    return pathname === to
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={2}
      className="text-sidebar-foreground/70"
    />
  )
}
