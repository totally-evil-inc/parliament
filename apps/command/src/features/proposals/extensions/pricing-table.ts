import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { PricingTableView } from "@/features/proposals/components/pricing-table-view"

export const PricingTable = Node.create({
  name: "pricingTable",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      items: {
        default: [
          {
            description: "Item 1",
            details: "",
            quantity: 1,
            rate: 0,
            total: 0,
            showDetails: false,
            showImage: false,
          },
        ],
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
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PricingTableView)
  },
})
