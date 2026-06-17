import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { KeyNumbersView } from "@/features/proposals/components/key-numbers-view"

export const KeyNumbers = Node.create({
  name: "keyNumbers",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      metrics: {
        default: [
          { label: "Metric 1", value: "000" },
          { label: "Metric 2", value: "000" },
          { label: "Metric 3", value: "000" },
        ],
      },
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
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(KeyNumbersView)
  },
})
