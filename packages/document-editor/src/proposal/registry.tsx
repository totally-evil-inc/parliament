import {
  ArrowDownTrayIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  PlayCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline"
import { defaultDocumentTemplate } from "@workspace/document/presentation"
import type { DocumentDefinition } from "../core/types"
import { proposalBlocks } from "./blocks/proposal-blocks"

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
      icon: DocumentTextIcon,
      command: (editor) => editor.chain().focus().setNode("paragraph").run(),
    },
    { id: "gallery", label: "Image", icon: PhotoIcon, blockId: "gallery" },
    {
      id: "timeline",
      label: "Video",
      icon: PlayCircleIcon,
      blockId: "timeline",
    },
    {
      id: "testimonials",
      label: "Quote",
      icon: ChatBubbleBottomCenterTextIcon,
      blockId: "testimonials",
    },
    {
      id: "team-members",
      label: "Icon",
      icon: SparklesIcon,
      blockId: "team-members",
    },
    {
      id: "line-items",
      label: "Table",
      icon: TableCellsIcon,
      blockId: "line-items",
    },
    {
      id: "layout",
      label: "Layout",
      icon: Squares2X2Icon,
      togglesSidebar: true,
    },
    {
      id: "export",
      label: "Export",
      icon: ArrowDownTrayIcon,
      hostAction: true,
    },
    {
      id: "send",
      label: "Send Proposal",
      icon: PaperAirplaneIcon,
      hostAction: true,
    },
  ],
  blocks: proposalBlocks,
}

export const proposalDocumentDefinition = proposalEditorRegistry
