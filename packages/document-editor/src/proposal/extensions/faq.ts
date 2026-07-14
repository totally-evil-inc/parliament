import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { FaqView } from "../components/faq-view"

export const Faq = Node.create({
  name: "proposalFaq",
  group: "block",
  content: "proposalFaqItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      variant: { default: "list" },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="proposal-faq"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-type": "proposal-faq" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqView)
  },
})

export const FaqItem = Node.create({
  name: "proposalFaqItem",
  content: "proposalFaqQuestion proposalFaqAnswer",

  addAttributes() {
    return {
      id: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="proposal-faq-item"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-faq-item",
        class: "group py-5 first:pt-0",
      }),
      0,
    ]
  },
})

export const FaqQuestion = Node.create({
  name: "proposalFaqQuestion",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-faq-question"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-faq-question",
        class: "text-base leading-6 font-semibold focus:outline-none",
      }),
      0,
    ]
  },
})

export const FaqAnswer = Node.create({
  name: "proposalFaqAnswer",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="proposal-faq-answer"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "proposal-faq-answer",
        class:
          "mt-2 text-sm text-[var(--document-muted-foreground)] focus:outline-none",
      }),
      0,
    ]
  },
})
