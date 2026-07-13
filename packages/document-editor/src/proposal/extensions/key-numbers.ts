import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { KeyNumbersView } from "../components/key-numbers-view"

export const KeyNumbers = Node.create({
  name: "keyNumbers",
  group: "block",
  content: "keyNumbersItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
      columns: { default: 3 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="key-numbers"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "key-numbers" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(KeyNumbersView)
  },
})

export const KeyNumbersItem = Node.create({
  name: "keyNumbersItem",
  content: "keyNumbersValue keyNumbersLabel keyNumbersDetail",
  defining: true,

  addAttributes() {
    return {
      id: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="key-numbers-item"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "key-numbers-item",
        class:
          "flex flex-col items-center justify-start rounded-xl p-6 text-center break-inside-avoid",
      }),
      0,
    ]
  },
})

export const KeyNumbersValue = Node.create({
  name: "keyNumbersValue",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="key-numbers-value"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "key-numbers-value",
        class:
          "text-4xl md:text-5xl font-black tracking-tight text-[var(--document-accent)] mb-1.5 min-h-[1.5em] empty:before:content-['99%'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      Tab: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
    }
  },
})

export const KeyNumbersLabel = Node.create({
  name: "keyNumbersLabel",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="key-numbers-label"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "key-numbers-label",
        class:
          "text-base md:text-lg font-bold tracking-tight text-[var(--document-foreground)] mb-1 min-h-[1.2em] empty:before:content-['Metric_Label'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      Tab: () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.after() + 1
        )
      },
      "Shift-Tab": () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.before() - 1
        )
      },
    }
  },
})

export const KeyNumbersDetail = Node.create({
  name: "keyNumbersDetail",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="key-numbers-detail"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "key-numbers-detail",
        class:
          "text-sm md:text-base leading-relaxed text-[var(--document-muted-foreground)] min-h-[1.2em] empty:before:content-['Metric_description...'] empty:before:text-muted-foreground/30 focus:outline-none",
      }),
      0,
    ]
  },
  addKeyboardShortcuts() {
    return {
      "Shift-Tab": () => {
        return this.editor.commands.focus(
          this.editor.state.selection.$from.before() - 1
        )
      },
    }
  },
})
