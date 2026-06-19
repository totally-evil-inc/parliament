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
            id: "testimonial-default-1",
            content:
              "The team brought clarity, speed, and care to every phase of the project.",
            author: "Jane Doe",
            role: "CEO, Tech Corp",
            avatar: "",
          },
          {
            id: "testimonial-default-2",
            content:
              "Their process helped us move faster without sacrificing quality or alignment.",
            author: "Michael Smith",
            role: "Founder, Northstar Labs",
            avatar: "",
          },
          {
            id: "testimonial-default-3",
            content:
              "We had confidence in the plan from kickoff through final delivery.",
            author: "Priya Patel",
            role: "COO, Atlas Studio",
            avatar: "",
          },
        ],
      },
      columns: { default: 3 },
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
