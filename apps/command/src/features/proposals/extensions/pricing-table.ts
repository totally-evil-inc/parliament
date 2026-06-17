import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { PricingTableView } from "@/features/proposals/components/pricing-table-view"

export const PricingTable = Node.create({
  name: "pricingTable",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      items: {
        default: [
          {
            description: "Initial Consultation",
            quantity: 1,
            rate: 150,
            total: 150,
          },
          { description: "Design Phase", quantity: 1, rate: 2500, total: 2500 },
          { description: "Development", quantity: 1, rate: 5000, total: 5000 },
        ],
      },
      currency: { default: "$" },
      taxRate: { default: 0 },
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
