import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  PlusSignIcon,
  QuillWrite02Icon,
} from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"

export function TestimonialsView({ node, updateAttributes }: NodeViewProps) {
  const { testimonials } = node.attrs

  const updateTestimonial = (index: number, key: string, value: string) => {
    const newTestimonials = [...testimonials]
    newTestimonials[index] = { ...newTestimonials[index], [key]: value }
    updateAttributes({ testimonials: newTestimonials })
  }

  const addTestimonial = () => {
    updateAttributes({
      testimonials: [
        ...testimonials,
        {
          content: "Enter the testimonial here...",
          author: "Name",
          role: "Role",
          avatar: "",
        },
      ],
    })
  }

  const removeTestimonial = (index: number) => {
    updateAttributes({
      testimonials: testimonials.filter((_: any, i: number) => i !== index),
    })
  }

  return (
    <NodeViewWrapper className="testimonials my-12 space-y-8 rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Testimonials
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={addTestimonial}
          className="h-8 gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add Testimonial
        </Button>
      </div>

      <div className="space-y-12">
        {testimonials.map((testimonial: any, index: number) => (
          <div
            key={index}
            className="group relative flex flex-col items-center gap-6 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={QuillWrite02Icon} className="h-6 w-6" />
            </div>

            <textarea
              className="w-full resize-none overflow-hidden bg-transparent text-center text-xl leading-relaxed font-medium italic outline-none"
              value={testimonial.content}
              rows={2}
              onChange={(e) => {
                updateTestimonial(index, "content", e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
              onFocus={(e) => {
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
            />

            <div className="space-y-1">
              <input
                className="w-full bg-transparent text-center text-base font-bold outline-none"
                value={testimonial.author}
                onChange={(e) =>
                  updateTestimonial(index, "author", e.target.value)
                }
              />
              <input
                className="w-full bg-transparent text-center text-xs tracking-widest text-muted-foreground uppercase outline-none"
                value={testimonial.role}
                onChange={(e) =>
                  updateTestimonial(index, "role", e.target.value)
                }
              />
            </div>

            <button
              onClick={() => removeTestimonial(index)}
              className="absolute top-0 -right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
