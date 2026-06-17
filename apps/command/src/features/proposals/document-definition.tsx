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
import { proposalBlocks } from "./blocks/proposal-blocks"
import type { DocumentDefinition } from "@/features/documents/editor/types"

export const proposalDocumentDefinition: DocumentDefinition = {
  type: "proposal",
  title: "Proposal",
  placeholder: "Start building your proposal...",
  presets: ["business"],
  insertPolicy: {
    beforeNodeType: "lineItems",
  },
  initialContent: {
    type: "doc",
    content: [
      { type: "documentHeader" },
      { type: "paragraph" },
      { type: "lineItems" },
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
      command: (editor) => editor.commands.focus(),
    },
    {
      id: "send",
      label: "Send Proposal",
      icon: Share01Icon,
      command: (editor) => editor.commands.focus(),
    },
  ],
  blocks: proposalBlocks,
}
