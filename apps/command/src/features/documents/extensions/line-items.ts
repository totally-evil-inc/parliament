import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import LineItemsView from "@/features/documents/components/line-items-view"

export const LineItems = Node.create({
  name: "lineItems",
  atom: true,
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      items: {
        default: [],
      },
      discountRate: { default: 0 },
      taxRate: { default: 0 },
      discountEnabled: { default: false },
      taxEnabled: { default: false },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="line-items"]' },
      { tag: 'div[data-type="pricing-table"]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "line-items" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LineItemsView, {
      stopEvent: () => true,
    })
  },
})
