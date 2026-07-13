import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
import { IconCircleDotsVertical, IconDeleteX, IconEnvelope, IconLock } from "nucleo-glass"
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
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRoleChange = async (member: Member, role: string | null) => {
    if (!isEditableRole(role) || role === member.role) return

    const confirmed = await confirm({
      title: `Change ${member.user.name}'s role?`,
      description: `${member.user.name} will become ${role === "admin" ? "an admin" : "a member"} in this workspace.`,
      confirmLabel: "Change role",
    })

    if (!confirmed) return

    setRoleUpdating(member.id)
    try {
      await authClient.organization.updateMemberRole({
        memberId: member.id,
        role,
        organizationId,
      })
      await queryClient.invalidateQueries({ queryKey: ["org-members"] })
    } finally {
      setRoleUpdating(null)
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

    setRemoving(member.id)
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId,
      })
      await queryClient.invalidateQueries({ queryKey: ["org-members"] })
    } finally {
      setRemoving(null)
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
                      <AvatarFallback className="bg-foreground/[0.06] text-[11px] font-medium text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {member.user.name}
                        </span>
                        {isSelf ? (
                          <Badge
                            variant="outline"
                            className="py-0 font-mono text-[9px] tracking-wider uppercase"
                          >
                            you
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {isOwner ? (
                    <Badge variant="outline" className="gap-1.5">
                      <IconLock className="size-3" />
                      Owner
                    </Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        void handleRoleChange(member, role)
                      }
                      disabled={roleUpdating === member.id || isSelf}
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

                <TableCell className="text-sm text-muted-foreground tabular-nums">
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
                            disabled={removing === member.id}
                          />
                        }
                      >
                        <IconCircleDotsVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() =>
                            member.user.email &&
                            window.open(`mailto:${member.user.email}`)
                          }
                        >
                          <IconEnvelope />
                          Send email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void handleRemove(member)}
                        >
                          <IconDeleteX />
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
