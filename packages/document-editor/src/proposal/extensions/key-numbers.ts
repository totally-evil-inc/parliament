import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { KeyNumbersView } from "../components/key-numbers-view"

export const KeyNumbers = Node.create({
  name: "keyNumbers",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      metrics: {
        default: [
          {
            id: "metric-default-1",
            value: "150+",
            label: "Projects Delivered",
            detail: "Successfully completed across multiple industries",
          },
          {
            id: "metric-default-2",
            value: "$10M",
            label: "Managed budget",
            detail: "Add muted context that supports this metric.",
          },
          {
            id: "metric-default-3",
            value: "24/7",
            label: "Support coverage",
            detail: "Describe the promise, impact, or scope behind it.",
          },
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
