import {
  IconCloudDownload,
  IconImage,
  IconGrid,
  IconGrid2,
  IconFeather,
  IconLink,
  IconStar,
  IconNote,
  IconVideo,
} from "nucleo-glass"
import { proposalBlocks } from "./blocks/proposal-blocks"
import type { DocumentDefinition } from "../core/types"
import { defaultDocumentTemplate } from "@workspace/document/presentation"

const proposalDocumentTemplate = {
  ...defaultDocumentTemplate,
  id: "proposal-classic",
  name: "Proposal Classic",
  tokens: defaultDocumentTemplate.tokens,
} satisfies DocumentDefinition["defaultTemplate"]

export const proposalEditorRegistry: DocumentDefinition = {
  type: "proposal",
  title: "Proposal",
  placeholder: "Start building your proposal...",
  defaultTemplate: proposalDocumentTemplate,
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
          blockId: "proposal-header",
          binding: "proposal.parties",
          headerLayout: "mark-left-dates-right",
        },
      },
      { type: "paragraph" },
      {
        type: "lineItems",
        attrs: {
          blockId: "proposal-pricing",
          binding: "proposal.pricing",
        },
      },
    ],
  },
  toolbarActions: [
    {
      id: "text",
      label: "Text",
      icon: IconNote,
      command: (editor) => editor.chain().focus().setNode("paragraph").run(),
    },
    { id: "gallery", label: "Image", icon: IconImage, blockId: "gallery" },
    {
      id: "timeline",
      label: "Video",
      icon: IconVideo,
      blockId: "timeline",
    },
    {
      id: "testimonials",
      label: "Quote",
      icon: IconFeather,
      blockId: "testimonials",
    },
    {
      id: "team-members",
      label: "Icon",
      icon: IconStar,
      blockId: "team-members",
    },
    {
      id: "line-items",
      label: "Table",
      icon: IconGrid2,
      blockId: "line-items",
    },
    {
      id: "layout",
      label: "Layout",
      icon: IconGrid,
      togglesSidebar: true,
    },
    {
      id: "export",
      label: "Export",
      icon: IconCloudDownload,
      hostAction: true,
    },
    {
      id: "send",
      label: "Send Proposal",
      icon: IconLink,
      hostAction: true,
    },
  ],
  blocks: proposalBlocks,
}

export const proposalDocumentDefinition = proposalEditorRegistry
