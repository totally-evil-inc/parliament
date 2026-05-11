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
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ComputerIcon,
  CreditCardIcon,
  Logout01Icon,
  Moon02Icon,
  Sun02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import type { WorkspaceUserProfile } from "@/features/workspace/config"
import type { ThemePreference } from "@/components/theme-provider"
import { authClient } from "@/lib/auth-client"
import { useTheme } from "@/components/theme-provider"

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  switch (preference) {
    case "light":
      return <HugeiconsIcon icon={Sun02Icon} />
    case "dark":
      return <HugeiconsIcon icon={Moon02Icon} />
    default:
      return <HugeiconsIcon icon={ComputerIcon} />
  }
}

export function AccountMenu({ user }: { user: WorkspaceUserProfile }) {
  const { setPreference } = useTheme()

  const handleSignOut = async () => {
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
              <AvatarFallback className="bg-sidebar-foreground text-[10px] font-medium text-sidebar">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
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
              <AvatarFallback className="bg-sidebar-foreground text-[10px] font-medium text-sidebar">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <HugeiconsIcon icon={UserIcon} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={CreditCardIcon} />
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
            <HugeiconsIcon icon={Logout01Icon} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
