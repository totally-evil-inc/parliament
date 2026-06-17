import { Node } from "@tiptap/core"

export const ProposalDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "proposalHeader block* pricingTable",
})
