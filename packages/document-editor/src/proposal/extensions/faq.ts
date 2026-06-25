import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { FaqView } from "../components/faq-view"

export const Faq = Node.create({
  name: "proposalFaq",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      variant: { default: "list" },
      items: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-faq"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-faq" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqView)
  },
})
