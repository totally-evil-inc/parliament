import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import {
  ProposalColumnsView,
  ProposalCoverView,
  ProposalImageCardsView,
  ProposalImageTextView,
  ProposalSignatureView,
} from "../components/visual-blocks-view"

export const ProposalCover = Node.create({
  name: "proposalCover",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      eyebrow: { default: { type: "doc", content: [] } },
      title: { default: { type: "doc", content: [] } },
      subtitle: { default: { type: "doc", content: [] } },
      media: { default: null },
      variant: { default: "split" },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-cover"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-cover" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalCoverView)
  },
})

export const ProposalColumns = Node.create({
  name: "proposalColumns",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      columns: { default: 3 },
      title: { default: { type: "doc", content: [] } },
      items: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-columns"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-columns" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalColumnsView)
  },
})

export const ProposalImageText = Node.create({
  name: "proposalImageText",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      image: { default: null },
      eyebrow: { default: { type: "doc", content: [] } },
      title: { default: { type: "doc", content: [] } },
      content: { default: { type: "doc", content: [] } },
      reverse: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-image-text"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-image-text" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalImageTextView)
  },
})

export const ProposalImageCards = Node.create({
  name: "proposalImageCards",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      columns: { default: 3 },
      variant: { default: "vertical" },
      items: { default: [] },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-image-cards"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-image-cards" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalImageCardsView)
  },
})

export const ProposalSignature = Node.create({
  name: "proposalSignature",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      binding: { default: "proposal.pricing.signer" },
      title: { default: { type: "doc", content: [] } },
      terms: { default: { type: "doc", content: [] } },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-signature"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-signature" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalSignatureView)
  },
})
