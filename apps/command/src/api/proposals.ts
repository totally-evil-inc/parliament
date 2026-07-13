import { queryOptions } from "@tanstack/react-query"
import {
  getProposalDraft,
  getPublicProposal,
  listProposalDrafts,
} from "@/server/proposals"

export const proposalDraftsQuery = queryOptions({
  queryKey: ["proposals", "drafts"],
  queryFn: () => listProposalDrafts(),
})

export function proposalDraftQuery(id: string) {
  return queryOptions({
    queryKey: ["proposals", "draft", id],
    queryFn: () => getProposalDraft({ data: { id } }),
  })
}

export function publicProposalQuery(token: string) {
  return queryOptions({
    queryKey: ["proposals", "public", token],
    queryFn: () => getPublicProposal({ data: { token } }),
    staleTime: 0,
  })
}
