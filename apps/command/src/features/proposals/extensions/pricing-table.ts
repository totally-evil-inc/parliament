import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { PricingTableView } from "@/features/proposals/components/pricing-table-view"

export const PricingTable = Node.create({
  name: "pricingTable",
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
    return [{ tag: 'div[data-type="pricing-table"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "pricing-table" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PricingTableView, {
      stopEvent: () => true,
    })
  },
})
