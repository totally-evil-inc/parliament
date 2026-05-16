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
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete01Icon,
  MailSend01Icon,
  More01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
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

const EDITABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
]

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase()
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

type Props = {
  members: Member[]
  currentUserId?: string
  organizationId: string
}

export function MembersTable({ members, currentUserId, organizationId }: Props) {
  const queryClient = useQueryClient()
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRoleChange = async (memberId: string, role: string | null) => {
    if (!role) return
    setRoleUpdating(memberId)
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: role as "admin" | "member",
        organizationId,
      })
      await queryClient.invalidateQueries({ queryKey: ["org-members"] })
    } finally {
      setRoleUpdating(null)
    }
  }

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId)
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId,
      })
      await queryClient.invalidateQueries({ queryKey: ["org-members"] })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-xs/5 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="ps-4">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="pe-4 w-px" />
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
                        <span className="font-medium text-sm">{member.user.name}</span>
                        {isSelf ? (
                          <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider py-0">
                            you
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {isOwner ? (
                    <Badge variant="outline" className="gap-1.5">
                      <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3" />
                      Owner
                    </Badge>
                  ) : (
                    <Select
                      value={member.role ?? "member"}
                      onValueChange={(role) => handleRoleChange(member.id, role)}
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
                        <HugeiconsIcon icon={More01Icon} strokeWidth={2} className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => member.user.email && window.open(`mailto:${member.user.email}`)}
                        >
                          <HugeiconsIcon icon={MailSend01Icon} strokeWidth={2} />
                          Send email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleRemove(member.id)}
                        >
                          <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
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
