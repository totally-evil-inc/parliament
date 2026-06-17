import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ProposalHeaderView } from "@/features/proposals/components/proposal-header-view"

export const ProposalHeader = Node.create({
  name: "proposalHeader",
  group: "block",
  content: "block*", // We'll handle internal fields via attributes or nested nodes
  defining: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      title: { default: "Untitled Proposal" },
      date: { default: new Date().toISOString().slice(0, 10) },
      due: { default: "" },
      validUntil: { default: "" },
      fromName: { default: "" },
      fromEmail: { default: "" },
      fromAddress: { default: "" },
      fromPhone: { default: "" },
      fromWebsite: { default: "" },
      fromTaxId: { default: "" },
      fromCustomFields: { default: [] },
      billToName: { default: "" },
      billToEmail: { default: "" },
      billToAddress: { default: "" },
      billToPhone: { default: "" },
      billToWebsite: { default: "" },
      billToTaxId: { default: "" },
      billToCustomFields: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="proposal-header"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-header" }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalHeaderView)
  },
})
