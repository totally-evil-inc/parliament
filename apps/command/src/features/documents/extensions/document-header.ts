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
      titleContent: { default: null },
      date: { default: "" },
      due: { default: "" },
      validUntil: { default: "" },
      fromName: { default: "" },
      fromNameContent: { default: null },
      fromEmail: { default: "" },
      fromEmailContent: { default: null },
      fromAddress: { default: "" },
      fromAddressContent: { default: null },
      fromPhone: { default: "" },
      fromPhoneContent: { default: null },
      fromWebsite: { default: "" },
      fromWebsiteContent: { default: null },
      fromTaxId: { default: "" },
      fromTaxIdContent: { default: null },
      fromCustomFields: { default: [] },
      billToName: { default: "" },
      billToNameContent: { default: null },
      billToEmail: { default: "" },
      billToEmailContent: { default: null },
      billToAddress: { default: "" },
      billToAddressContent: { default: null },
      billToPhone: { default: "" },
      billToPhoneContent: { default: null },
      billToWebsite: { default: "" },
      billToWebsiteContent: { default: null },
      billToTaxId: { default: "" },
      billToTaxIdContent: { default: null },
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
