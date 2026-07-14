import {
  Download01Icon,
  Image01Icon,
  LayoutGridIcon,
  LayoutTableIcon,
  QuillWrite02Icon,
  Share01Icon,
  StarIcon,
  TextFontIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"
import { defaultDocumentTemplate } from "@workspace/document/presentation"
import type { DocumentDefinition } from "../core/types"
import { proposalBlocks } from "../proposal/blocks/proposal-blocks"

const invoiceDocumentTemplate = {
  ...defaultDocumentTemplate,
  id: "invoice-classic",
  name: "Invoice Classic",
  tokens: defaultDocumentTemplate.tokens,
} satisfies DocumentDefinition["defaultTemplate"]

export const invoiceEditorRegistry: DocumentDefinition = {
  type: "invoice",
  title: "Invoice",
  placeholder: "Start building your invoice...",
  defaultTemplate: invoiceDocumentTemplate,
  presets: ["business"],
  insertPolicy: {
    beforeNodeType: "lineItems",
  },
  initialContent: {
    type: "doc",
    content: [
      {
        type: "documentHeader",
        attrs: {
          blockId: "invoice-header",
          binding: "invoice.parties",
          headerLayout: "mark-left-dates-right",
        },
      },
      { type: "paragraph" },
      {
        type: "lineItems",
        attrs: {
          blockId: "invoice-pricing",
          binding: "invoice.pricing",
        },
      },
    ],
  },
  toolbarActions: [
    {
      id: "text",
      label: "Text",
      icon: TextFontIcon,
      command: (editor) => editor.chain().focus().setNode("paragraph").run(),
    },
    { id: "gallery", label: "Image", icon: Image01Icon, blockId: "gallery" },
    {
      id: "timeline",
      label: "Video",
      icon: VideoReplayIcon,
      blockId: "timeline",
    },
    {
      id: "testimonials",
      label: "Quote",
      icon: QuillWrite02Icon,
      blockId: "testimonials",
    },
    {
      id: "team-members",
      label: "Icon",
      icon: StarIcon,
      blockId: "team-members",
    },
    {
      id: "line-items",
      label: "Table",
      icon: LayoutTableIcon,
      blockId: "line-items",
    },
    {
      id: "layout",
      label: "Layout",
      icon: LayoutGridIcon,
      togglesSidebar: true,
    },
    {
      id: "export",
      label: "Export",
      icon: Download01Icon,
      hostAction: true,
    },
    {
      id: "send",
      label: "Send Invoice",
      icon: Share01Icon,
      hostAction: true,
    },
  ],
  blocks: proposalBlocks,
}

export const invoiceDocumentDefinition = invoiceEditorRegistry
