import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ProposalSectionView } from "../components/proposal-section-view"

export const ProposalSection = Node.create({
  name: "proposalSection",
  group: "block",
  content:
    "proposalSectionEyebrow proposalSectionTitle proposalSectionLead proposalSectionBody",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      variant: { default: "default" },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-section"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-section" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProposalSectionView)
  },
})

export const ProposalSectionEyebrow = Node.create({
  name: "proposalSectionEyebrow",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-section-eyebrow"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-section-eyebrow",
        class:
          "h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase focus:outline-none",
      }),
      0,
    ]
  },
})

export const ProposalSectionTitle = Node.create({
  name: "proposalSectionTitle",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-section-title"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-section-title",
        class:
          "[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal focus:outline-none",
      }),
      0,
    ]
  },
})

export const ProposalSectionLead = Node.create({
  name: "proposalSectionLead",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-section-lead"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-section-lead",
        class:
          "text-base leading-7 text-[var(--document-muted-foreground)] focus:outline-none",
      }),
      0,
    ]
  },
})

export const ProposalSectionBody = Node.create({
  name: "proposalSectionBody",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-section-body"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-section-body",
        class: "mt-5 text-sm text-[var(--document-foreground)] focus:outline-none",
      }),
      0,
    ]
  },
})
