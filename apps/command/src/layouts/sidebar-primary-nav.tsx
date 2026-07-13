import { Link, useRouterState } from "@tanstack/react-router"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import type { WorkspaceNavItem } from "@/features/workspace/config"

export function SidebarPrimaryNav({
  items,
}: {
  items: Array<WorkspaceNavItem>
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <SidebarGroup className="py-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-3">
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              {item.to ? (
                <SidebarMenuButton
                  tooltip={item.label}
                  isActive={isActiveNavItem(item.to, pathname)}
                  render={<Link to={item.to} />}
                >
                  <item.icon className="text-sidebar-foreground/70" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton type="button" tooltip={item.label}>
                  <item.icon className="text-sidebar-foreground/70" />
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
