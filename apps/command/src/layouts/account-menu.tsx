import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"
import {
  IconBrightnessIncrease,
  IconCloudMoon,
  IconCreditCards,
  IconExpandWindow,
  IconMonitor,
  IconUser,
} from "nucleo-glass"
import { useConfirm } from "@/components/confirm-dialog-provider"
import type { ThemePreference } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import type { WorkspaceUserProfile } from "@/features/workspace/config"
import { authClient } from "@/lib/auth-client"

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  switch (preference) {
    case "light":
      return <IconBrightnessIncrease />
    case "dark":
      return <IconCloudMoon />
    default:
      return <IconMonitor />
  }
}

export function AccountMenu({ user }: { user: WorkspaceUserProfile }) {
  const { setPreference } = useTheme()
  const confirm = useConfirm()

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: "Sign out?",
      description: "You will need to sign in again to access this workspace.",
      confirmLabel: "Sign out",
      variant: "destructive",
    })

    if (!confirmed) return

    await authClient.signOut()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            type="button"
            size="lg"
            tooltip={user.name}
            className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-1!"
          >
            <Avatar className="group-data-[collapsible=icon]:size-6">
              <AvatarFallback className="bg-sidebar-foreground font-medium text-[10px] text-sidebar">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium text-sm">{user.name}</span>
              <span className="truncate text-sidebar-foreground/60 text-xs">
                {user.email}
              </span>
            </span>
          </SidebarMenuButton>
        }
      />

      <DropdownMenuContent
        className="w-56"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-foreground font-medium text-[10px] text-sidebar">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconUser />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCreditCards />
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ThemeIcon preference="system" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={-4}>
              <DropdownMenuItem onClick={() => setPreference("light")}>
                <ThemeIcon preference="light" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreference("dark")}>
                <ThemeIcon preference="dark" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreference("system")}>
                <ThemeIcon preference="system" />
                System
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <IconExpandWindow />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
