import { useQuery } from "@tanstack/react-query"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth-client"
import { InviteTeammatesForm } from "@/features/workspace/components/invite-teammates-form"
import { MembersTable } from "./members-table"
import { InvitationsList } from "./invitations-list"

export function MembersPage() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const session = authClient.useSession()
  const currentUserId = session.data?.user?.id as string | undefined

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
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Members · Invite
        </div>
        <h2 className="mt-1 font-heading text-xl">Invite teammates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste or type emails separated by spaces, commas, or new lines.
        </p>
        <div className="mt-5">
          <InviteTeammatesForm organizationId={activeOrg.id} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Members · List
            </div>
            <h2 className="mt-1 font-heading text-xl">
              {members?.length ?? "—"}{" "}
              {(members?.length ?? 0) === 1 ? "person" : "people"}
            </h2>
          </div>
        </div>

        {membersPending ? (
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
