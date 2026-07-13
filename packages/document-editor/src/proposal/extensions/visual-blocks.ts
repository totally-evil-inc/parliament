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
  content: "proposalCoverEyebrow proposalCoverTitle proposalCoverSubtitle",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
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
  content: "proposalColumnsTitle proposalColumnItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      columns: { default: 3 },
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
  content:
    "proposalImageTextEyebrow proposalImageTextTitle proposalImageTextBody",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      image: { default: null },
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
  content: "proposalImageCardItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      columns: { default: 3 },
      variant: { default: "vertical" },
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
  content: "proposalSignatureTitle proposalSignatureTerms",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      binding: { default: "proposal.pricing.signer" },
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

function inlineField(name: string, dataType: string, className: string) {
  return Node.create({
    name,
    content: "inline*",
    parseHTML() {
      return [{ tag: `div[data-type="${dataType}"]` }]
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": dataType,
          class: `${className} focus:outline-none`,
        }),
        0,
      ]
    },
  })
}

function blockField(name: string, dataType: string, className: string) {
  return Node.create({
    name,
    content: "block+",
    parseHTML() {
      return [{ tag: `div[data-type="${dataType}"]` }]
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": dataType,
          class: `${className} focus:outline-none`,
        }),
        0,
      ]
    },
  })
}

export const ProposalCoverEyebrow = inlineField(
  "proposalCoverEyebrow",
  "proposal-cover-eyebrow",
  "h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
)

export const ProposalCoverTitle = inlineField(
  "proposalCoverTitle",
  "proposal-cover-title",
  "[font-family:var(--document-heading-font-family)] text-4xl leading-tight font-bold tracking-normal"
)

export const ProposalCoverSubtitle = inlineField(
  "proposalCoverSubtitle",
  "proposal-cover-subtitle",
  "max-w-2xl text-base leading-7 text-[var(--document-muted-foreground)]"
)

export const ProposalColumnsTitle = inlineField(
  "proposalColumnsTitle",
  "proposal-columns-title",
  "[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
)

export const ProposalColumnItem = Node.create({
  name: "proposalColumnItem",
  content: "proposalColumnHeading proposalColumnBody",
  defining: true,
  parseHTML() {
    return [{ tag: 'section[data-type="proposal-column-item"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-column-item",
        class: "break-inside-avoid border-t border-[var(--document-border)] pt-4",
      }),
      0,
    ]
  },
})

export const ProposalColumnHeading = inlineField(
  "proposalColumnHeading",
  "proposal-column-heading",
  "text-base font-semibold"
)

export const ProposalColumnBody = blockField(
  "proposalColumnBody",
  "proposal-column-body",
  "mt-2 text-sm text-[var(--document-muted-foreground)]"
)

export const ProposalImageTextEyebrow = inlineField(
  "proposalImageTextEyebrow",
  "proposal-image-text-eyebrow",
  "h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
)

export const ProposalImageTextTitle = inlineField(
  "proposalImageTextTitle",
  "proposal-image-text-title",
  "mt-2 [font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
)

export const ProposalImageTextBody = blockField(
  "proposalImageTextBody",
  "proposal-image-text-body",
  "mt-4 text-sm text-[var(--document-foreground)]"
)

export const ProposalImageCardItem = Node.create({
  name: "proposalImageCardItem",
  content: "proposalImageCardTitle proposalImageCardBody",

  addAttributes() {
    return {
      id: { default: null },
      image: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-image-card-item"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-image-card-item",
        class:
          "break-inside-avoid rounded-[var(--document-radius)] border border-[var(--document-border)] p-4",
      }),
      [
        "div",
        {
          class:
            "proposal-image-placeholder mb-4 flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_55%,transparent)]",
        },
        ["span", { class: "text-[10px] font-semibold tracking-widest uppercase" }, "Image"],
      ],
      ["div", { class: "proposal-image-card-content" }, 0],
    ]
  },
})

export const ProposalImageCardTitle = inlineField(
  "proposalImageCardTitle",
  "proposal-image-card-title",
  "text-base font-semibold"
)

export const ProposalImageCardBody = blockField(
  "proposalImageCardBody",
  "proposal-image-card-body",
  "mt-2 text-sm text-[var(--document-muted-foreground)]"
)

export const ProposalSignatureTitle = inlineField(
  "proposalSignatureTitle",
  "proposal-signature-title",
  "[font-family:var(--document-heading-font-family)] text-2xl leading-tight font-bold tracking-normal"
)

export const ProposalSignatureTerms = blockField(
  "proposalSignatureTerms",
  "proposal-signature-terms",
  "mt-3 text-sm text-[var(--document-muted-foreground)]"
)
