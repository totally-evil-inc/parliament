import { Node, mergeAttributes } from "@tiptap/core"
import type { NodeViewRenderer } from "@tiptap/core"

export const DocumentRoot = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
})

export function createPartyHeaderExtension(
  addNodeView?: () => NodeViewRenderer
) {
  return Node.create({
    name: "documentHeader",
    group: "block",
    atom: true,
    defining: true,
    isolating: true,
    draggable: false,
    selectable: false,
    addAttributes: () => ({
      blockId: { default: "proposal-header" },
      binding: { default: "proposal.parties" },
      headerLayout: { default: "mark-left-dates-right" },
    }),
    parseHTML: () => [
      { tag: 'div[data-type="document-header"]' },
      { tag: 'div[data-type="proposal-header"]' },
    ],
    renderHTML: ({ HTMLAttributes }) => [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "document-header" }),
    ],
    addNodeView,
  })
}

export function createPricingExtension(addNodeView?: () => NodeViewRenderer) {
  return Node.create({
    name: "lineItems",
    group: "block",
    atom: true,
    defining: true,
    isolating: true,
    addAttributes: () => ({
      blockId: { default: "proposal-pricing" },
      binding: { default: "proposal.pricing" },
    }),
    parseHTML: () => [
      { tag: 'div[data-type="line-items"]' },
      { tag: 'div[data-type="pricing-table"]' },
    ],
    renderHTML: ({ HTMLAttributes }) => [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "line-items" }),
    ],
    addNodeView,
  })
}
