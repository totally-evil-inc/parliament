import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import DocumentHeaderView from "@/features/documents/components/document-header-view"

export const DocumentHeader = Node.create({
  name: "documentHeader",
  group: "block",
  atom: true,
  defining: true,
  isolating: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      headerLayout: { default: "mark-left-dates-right" },
      title: { default: "" },
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
    return [
      { tag: 'div[data-type="document-header"]' },
      { tag: 'div[data-type="proposal-header"]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "document-header" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentHeaderView, {
      stopEvent: () => true,
    })
  },
})
