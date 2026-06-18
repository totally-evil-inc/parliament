import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { authClient } from "@/lib/auth-client"

type Invitation = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: Date | string
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

type Props = {
  invitations: Array<Invitation>
}

export function InvitationsList({ invitations }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [canceling, setCanceling] = useState<string | null>(null)

  const handleCancel = async (invitation: Invitation) => {
    const confirmed = await confirm({
      title: "Revoke invitation?",
      description: `${invitation.email} will no longer be able to join from this invitation.`,
      confirmLabel: "Revoke invitation",
      variant: "destructive",
    })

    if (!confirmed) return

    setCanceling(invitation.id)
    try {
      await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      })
      await queryClient.invalidateQueries({ queryKey: ["org-invitations"] })
    } finally {
      setCanceling(null)
    }
  }

  if (!invitations.length) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Pending invitations
        </span>
        <Badge
          variant="outline"
          className="py-0 font-mono text-[9px] uppercase"
        >
          {invitations.length}
        </Badge>
      </div>

      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{inv.email}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                  {inv.role ?? "member"}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Expires {formatDate(inv.expiresAt)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase hover:text-destructive"
              disabled={canceling === inv.id}
              onClick={() => void handleCancel(inv)}
            >
              {canceling === inv.id ? "Revoking…" : "Revoke"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
