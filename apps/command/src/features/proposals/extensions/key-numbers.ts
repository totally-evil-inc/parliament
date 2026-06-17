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
          {
            value: "150+",
            label: "Projects Delivered",
            detail: "Successfully completed across multiple industries",
          },
          {
            value: "$10M",
            label: "Managed budget",
            detail: "Add muted context that supports this metric.",
          },
          {
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
