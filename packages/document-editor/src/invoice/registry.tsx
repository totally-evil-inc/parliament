import {
  Download01Icon,
  Image01Icon,
  LayoutGridIcon,
  LayoutTableIcon,
  Share01Icon,
  TextFontIcon,
  Tick01Icon,
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

export const invoiceBlocks = proposalBlocks
  .filter((block) => {
    return [
      "proposal-section",
      "proposal-columns",
      "proposal-image-text",
      "proposal-image-cards",
      "key-numbers",
      "gallery",
      "timeline",
      "line-items",
    ].includes(block.id)
  })
  .map((block) => {
    if (block.id === "proposal-section") {
      return {
        ...block,
        label: "Notes & Terms",
        description: "Add structured terms, late payment policy, or notes.",
      }
    }
    if (block.id === "line-items") {
      return {
        ...block,
        label: "Billing Table",
        description: "Add a billing table for services and rates.",
      }
    }
    if (block.id === "proposal-image-text") {
      return {
        ...block,
        description: "Display an image side-by-side with billing details.",
      }
    }
    if (block.id === "proposal-image-cards") {
      return {
        ...block,
        description: "Display images of deliverables in a row.",
      }
    }
    if (block.id === "key-numbers") {
      return {
        ...block,
        label: "Key Billing Metrics",
        description: "Highlight key billing metrics, hours, or milestone figures.",
      }
    }
    if (block.id === "gallery") {
      return {
        ...block,
        label: "Receipts & Attachments",
        description: "Showcase proof of deliverables or scan receipts in a grid.",
      }
    }
    if (block.id === "timeline") {
      return {
        ...block,
        label: "Billing Milestones",
        description: "Create a checklist of project milestones and billing progression.",
      }
    }
    return block
  })

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
    { id: "gallery", label: "Attachments", icon: Image01Icon, blockId: "gallery" },
    {
      id: "timeline",
      label: "Milestones",
      icon: Tick01Icon,
      blockId: "timeline",
    },
    {
      id: "line-items",
      label: "Billing Table",
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
  blocks: invoiceBlocks,
}

export const invoiceDocumentDefinition = invoiceEditorRegistry
