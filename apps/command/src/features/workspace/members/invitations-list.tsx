import { useMutation, useQueryClient } from "@tanstack/react-query"
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
  organizationId: string
}

export function InvitationsList({ invitations, organizationId }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-invitations", organizationId],
      })
    },
  })

  const handleCancel = async (invitation: Invitation) => {
    const confirmed = await confirm({
      title: "Revoke invitation?",
      description: `${invitation.email} will no longer be able to join from this invitation.`,
      confirmLabel: "Revoke invitation",
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await cancelInvitationMutation.mutateAsync(invitation.id)
    } catch (err) {
      console.error(err)
    }
  }

  if (!invitations.length) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
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
        {invitations.map((inv) => {
          const isRevoking =
            cancelInvitationMutation.isPending &&
            cancelInvitationMutation.variables === inv.id

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-sm">{inv.email}</div>
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
                className="shrink-0 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em] hover:text-destructive"
                disabled={isRevoking}
                onClick={() => void handleCancel(inv)}
              >
                {isRevoking ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
