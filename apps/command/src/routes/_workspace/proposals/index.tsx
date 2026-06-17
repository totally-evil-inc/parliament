import { createFileRoute } from "@tanstack/react-router"
import ProposalEditor from "@/features/proposals/components/proposal-editor"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <ProposalEditor />
}
