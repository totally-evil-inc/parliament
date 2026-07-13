import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { PageHeader } from "@/components/page-header"
import { proposalDraftsQuery } from "@/api/proposals"
import { createProposalDraft } from "@/server/proposals"
import type { PersistedProposalDraft } from "@/server/proposals"

export const Route = createFileRoute("/_workspace/proposals/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(proposalDraftsQuery)
  },
  component: ProposalsRoute,
})

function ProposalsRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: proposals } = useSuspenseQuery(proposalDraftsQuery)
  const createDraft = useMutation({
    mutationFn: () =>
      createProposalDraft({ data: { blueprint: "classic" } }),
    onSuccess: async (draftResult) => {
      const draft = draftResult as PersistedProposalDraft
      await queryClient.invalidateQueries({ queryKey: ["proposals"] })
      await navigate({
        to: "/proposals/$proposalId",
        params: { proposalId: draft.id },
      })
    },
  })

  return (
    <>
      <PageHeader
        title="Proposals"
        description="Create, send, and track durable proposal drafts for this workspace."
        action={
          <Button
            type="button"
            onClick={() => createDraft.mutate()}
            disabled={createDraft.isPending}
          >
            {createDraft.isPending ? "Creating..." : "Create proposal"}
          </Button>
        }
      />

      <div className="grid gap-4 p-6 md:p-8">
        {proposals.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No proposals yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create a proposal draft to start editing and sharing a public
              client link.
            </CardContent>
          </Card>
        ) : (
          proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/proposals/$proposalId"
                      params={{ proposalId: proposal.id }}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {proposal.title || "Untitled proposal"}
                    </Link>
                    <Badge variant="outline">{proposal.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span>Updated {formatDateTime(proposal.updatedAt)}</span>
                    <span>{proposal.viewCount} views</span>
                    {proposal.lastViewedAt ? (
                      <span>
                        Last viewed {formatDateTime(proposal.lastViewedAt)}
                      </span>
                    ) : null}
                    {proposal.acceptedAt ? (
                      <span>
                        Accepted {formatDateTime(proposal.acceptedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  {proposal.publicToken ? (
                    <Link
                      to="/proposal/$publicToken"
                      params={{ publicToken: proposal.publicToken }}
                      target="_blank"
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Public link
                    </Link>
                  ) : null}
                  <Link
                    to="/proposals/$proposalId"
                    params={{ proposalId: proposal.id }}
                    className={buttonVariants()}
                  >
                    Edit
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
