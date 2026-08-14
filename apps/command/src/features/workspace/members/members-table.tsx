import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  EllipsisVerticalIcon,
  EnvelopeIcon,
  LockClosedIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { authClient } from "@/lib/auth-client"

type Member = {
  id: string
  userId: string
  role: string
  createdAt: Date | string
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

type EditableRole = "admin" | "member"

const EDITABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
] satisfies Array<{ value: EditableRole; label: string }>

function isEditableRole(role: string | null): role is EditableRole {
  return role === "admin" || role === "member"
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join("")
    .toUpperCase()
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type Props = {
  members: Array<Member>
  currentUserId?: string
  organizationId: string
}

export function MembersTable({
  members,
  currentUserId,
  organizationId,
}: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string
      role: string
    }) => {
      const { error } = await authClient.organization.updateMemberRole({
        memberId,
        role,
        organizationId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-members", organizationId],
      })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-members", organizationId],
      })
    },
  })

  const handleRoleChange = async (member: Member, role: string | null) => {
    if (!isEditableRole(role) || role === member.role) return

    const confirmed = await confirm({
      title: `Change ${member.user.name}'s role?`,
      description: `${member.user.name} will become ${role === "admin" ? "an admin" : "a member"} in this workspace.`,
      confirmLabel: "Change role",
    })

    if (!confirmed) return

    try {
      await updateRoleMutation.mutateAsync({ memberId: member.id, role })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update member role"
      console.error(err)
      window.alert(msg)
    }
  }

  const handleRemove = async (member: Member) => {
    const confirmed = await confirm({
      title: `Remove ${member.user.name}?`,
      description: `${member.user.email} will lose access to this workspace.`,
      confirmLabel: "Remove member",
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await removeMemberMutation.mutateAsync(member.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member"
      console.error(err)
      window.alert(msg)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs/5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="ps-4">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-px pe-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isOwner = member.role === "owner"
            const isSelf = member.userId === currentUserId
            const initials = getInitials(member.user.name)

            return (
              <TableRow key={member.id}>
                <TableCell className="ps-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-foreground/[0.06] font-medium text-[11px] text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {member.user.name}
                        </span>
                        {isSelf ? (
                          <Badge
                            variant="outline"
                            className="py-0 font-mono text-[9px] uppercase tracking-wider"
                          >
                            you
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {isOwner ? (
                    <Badge variant="outline" className="gap-1.5">
                      <LockClosedIcon className="size-3" />
                      Owner
                    </Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        void handleRoleChange(member, role)
                      }
                      disabled={
                        (updateRoleMutation.isPending &&
                          updateRoleMutation.variables?.memberId ===
                            member.id) ||
                        isSelf
                      }
                    >
                      <SelectTrigger size="sm" className="h-8 w-32 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDITABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-sm tabular-nums">
                  {formatDate(member.createdAt)}
                </TableCell>

                <TableCell className="pe-4">
                  {!isOwner && !isSelf ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${member.user.name}`}
                            disabled={
                              removeMemberMutation.isPending &&
                              removeMemberMutation.variables === member.id
                            }
                          />
                        }
                      >
                        <EllipsisVerticalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() =>
                            member.user.email &&
                            window.open(`mailto:${member.user.email}`)
                          }
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                          Send email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void handleRemove(member)}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="size-8" />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
