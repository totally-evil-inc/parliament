import { useQuery } from "@tanstack/react-query"
import { Spinner } from "@workspace/ui/components/spinner"
import { InviteTeammatesForm } from "@/features/workspace/components/invite-teammates-form"
import { useWorkspace } from "@/layouts/workspace-provider"
import { authClient } from "@/lib/auth-client"
import { InvitationsList } from "./invitations-list"
import { MembersTable } from "./members-table"

export function MembersPage() {
  const { activeOrg, isSwitching } = useWorkspace()
  const session = authClient.useSession()
  const currentUserId = session.data?.user.id

  const { data: members, isPending: membersPending } = useQuery({
    queryKey: ["org-members", activeOrg?.id],
    queryFn: async () => {
      const result = await authClient.organization.listMembers()
      return result.data?.members ?? []
    },
    enabled: !!activeOrg?.id,
  })

  const { data: invitations, isPending: invitationsPending } = useQuery({
    queryKey: ["org-invitations", activeOrg?.id],
    queryFn: async () => {
      const result = await authClient.organization.listInvitations()
      return result.data ?? []
    },
    enabled: !!activeOrg?.id,
  })

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 md:px-8">
      <div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          Members · Invite
        </div>
        <h2 className="mt-1 font-heading text-xl">Invite teammates</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Paste or type emails separated by spaces, commas, or new lines.
        </p>
        <div className="mt-5">
          <InviteTeammatesForm organizationId={activeOrg.id} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
              Members · List
            </div>
            <h2 className="mt-1 font-heading text-xl">
              {members?.length ?? "—"}{" "}
              {(members?.length ?? 0) === 1 ? "person" : "people"}
            </h2>
          </div>
        </div>

        {isSwitching || membersPending ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <MembersTable
            members={members ?? []}
            currentUserId={currentUserId}
            organizationId={activeOrg.id}
          />
        )}

        {!invitationsPending && (invitations?.length ?? 0) > 0 ? (
          <InvitationsList invitations={invitations ?? []} />
        ) : null}
      </div>
    </div>
  )
}
