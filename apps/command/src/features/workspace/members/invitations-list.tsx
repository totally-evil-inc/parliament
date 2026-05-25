import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
  invitations: Invitation[]
}

export function InvitationsList({ invitations }: Props) {
  const queryClient = useQueryClient()
  const [canceling, setCanceling] = useState<string | null>(null)

  const handleCancel = async (invitationId: string) => {
    setCanceling(invitationId)
    try {
      await authClient.organization.cancelInvitation({ invitationId })
      await queryClient.invalidateQueries({ queryKey: ["org-invitations"] })
    } finally {
      setCanceling(null)
    }
  }

  if (!invitations.length) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          Pending invitations
        </span>
        <Badge variant="outline" className="font-mono text-[9px] uppercase py-0">
          {invitations.length}
        </Badge>
      </div>

      <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{inv.email}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
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
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive"
              disabled={canceling === inv.id}
              onClick={() => handleCancel(inv.id)}
            >
              {canceling === inv.id ? "Revoking…" : "Revoke"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
