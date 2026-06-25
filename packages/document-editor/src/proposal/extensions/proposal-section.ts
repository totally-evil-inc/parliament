import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ProposalSectionView } from "../components/proposal-section-view"

export const ProposalSection = Node.create({
  name: "proposalSection",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      eyebrow: { default: "" },
      title: { default: "" },
      lead: { default: "" },
      variant: { default: "default" },
      content: { default: { type: "doc", content: [] } },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-section"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-section" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalSectionView)
  },
})
