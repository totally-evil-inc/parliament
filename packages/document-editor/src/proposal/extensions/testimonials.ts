import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TestimonialsView } from "../components/testimonials-view"

export const Testimonials = Node.create({
  name: "testimonials",
  group: "block",
  content: "testimonialItem+",
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: null },
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
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TestimonialsView)
  },
})

export const TestimonialItem = Node.create({
  name: "testimonialItem",
  content: "testimonialQuote testimonialAuthor testimonialRole",
  defining: true,

  addAttributes() {
    return {
      id: { default: null },
      sourceId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="testimonial-item"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-type": "testimonial-item",
        class:
          "m-0 border-l-2 border-[var(--document-accent)] py-1 pl-5 text-left break-inside-avoid flex flex-col",
      }),
      0,
    ]
  },
})

export const TestimonialQuote = Node.create({
  name: "testimonialQuote",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="testimonial-quote"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "testimonial-quote",
        class:
          "text-base md:text-lg leading-relaxed font-medium text-[var(--document-muted-foreground)] italic mb-3 min-h-[1.5em] empty:before:content-['\\201c_Client_quote..._\\201d'] empty:before:text-muted-foreground/30 focus:outline-none",
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

export const TestimonialAuthor = Node.create({
  name: "testimonialAuthor",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="testimonial-author"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "testimonial-author",
        class:
          "text-sm md:text-base font-bold tracking-tight text-[var(--document-foreground)] mb-0.5 min-h-[1.2em] empty:before:content-['Client_Name'] empty:before:text-muted-foreground/30 focus:outline-none",
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

export const TestimonialRole = Node.create({
  name: "testimonialRole",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="testimonial-role"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "testimonial-role",
        class:
          "text-xs md:text-sm font-medium text-[var(--document-muted-foreground)] min-h-[1.2em] empty:before:content-['Title,_Company'] empty:before:text-muted-foreground/30 focus:outline-none",
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
