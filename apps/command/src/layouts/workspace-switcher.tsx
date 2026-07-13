import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  IconArrowBoldDown,
  IconCircleCheck,
  IconCircleCopyPlus,
} from "nucleo-glass"
import { useState } from "react"
import type { CreatedOrg } from "@/features/workspace/components/create-workspace-form"
import { CreateWorkspaceModal } from "@/features/workspace/components/create-workspace-modal"
import { useWorkspace } from "./workspace-provider"

export function WorkspaceSwitcher() {
  const [createOpen, setCreateOpen] = useState(false)
  const {
    activeOrg,
    organizations,
    isSwitching,
    switchOrganization,
    refreshWorkspaceState,
  } = useWorkspace()

  const handleSwitch = async (organizationId: string) => {
    await switchOrganization(organizationId)
  }

  const handleCreated = async (org: CreatedOrg) => {
    await switchOrganization(org.id)
    await refreshWorkspaceState()
  }

  const displayName = activeOrg?.name ?? "…"
  const displaySlug = activeOrg?.slug ?? ""

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-12 w-full items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              aria-label="Switch workspace"
            />
          }
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-medium text-sidebar-primary-foreground text-xs ring-1 ring-sidebar-border group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-sm group-data-[collapsible=icon]:text-[9px]">
            {displayName.slice(0, 1)}
          </span>
          <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium text-sm">{displayName}</span>
            <span className="truncate font-mono text-[10px] text-sidebar-foreground/60 uppercase tracking-[0.2em]">
              {displaySlug}
            </span>
          </span>
          <IconArrowBoldDown className="size-3.5 opacity-60 group-data-[collapsible=icon]:hidden" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="start"
          className="w-64"
          sideOffset={8}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {organizations.map((org) => {
              const isActive = org.id === activeOrg?.id
              return (
                <DropdownMenuItem
                  key={org.id}
                  className="min-h-10 cursor-pointer"
                  onClick={() => handleSwitch(org.id)}
                  disabled={isSwitching}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground text-xs">
                    {org.name.slice(0, 1)}
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{org.name}</span>
                    <span className="truncate font-mono text-[0.625rem] text-muted-foreground uppercase tracking-[0.15em]">
                      {org.slug}
                    </span>
                  </span>
                  {isActive ? (
                    <IconCircleCheck className="size-3.5 text-muted-foreground" />
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <IconCircleCopyPlus />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />
    </>
  )
}
