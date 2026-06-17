import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TestimonialsView } from "@/features/proposals/components/testimonials-view"

export const Testimonials = Node.create({
  name: "testimonials",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      testimonials: {
        default: [
          {
            content:
              "The level of professionalism and attention to detail exceeded our expectations. Highly recommended!",
            author: "Jane Doe",
            role: "CEO, Tech Corp",
            avatar: "",
          },
        ],
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="testimonials"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "testimonials" }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TestimonialsView)
  },
})
