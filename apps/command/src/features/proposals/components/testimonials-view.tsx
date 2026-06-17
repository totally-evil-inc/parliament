import { NodeViewWrapper } from "@tiptap/react"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type { NodeViewProps } from "@tiptap/react"
import type { Testimonial } from "@/features/proposals/types"
import { getArrayAttr, getColumnCount } from "@/features/proposals/types"

const inputClassName =
  "h-auto rounded-none !border-0 !bg-transparent !p-0 shadow-none !outline-none !ring-0 hover:!border-transparent focus-visible:!border-transparent focus-visible:!ring-0 dark:!bg-transparent"

export function TestimonialsView({ node, updateAttributes }: NodeViewProps) {
  const testimonials = getArrayAttr<Testimonial>(node.attrs.testimonials)
  const columns = getColumnCount(node.attrs.columns)

  const updateTestimonial = (
    index: number,
    key: keyof Testimonial,
    value: string
  ) => {
    const newTestimonials = [...testimonials]
    newTestimonials[index] = { ...newTestimonials[index], [key]: value }
    updateAttributes({ testimonials: newTestimonials })
  }

  const gridColumns =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3"

  return (
    <NodeViewWrapper className="testimonials my-12">
      <div className={`grid gap-x-10 gap-y-10 ${gridColumns}`}>
        {testimonials.map((testimonial, index) => (
          <blockquote
            key={index}
            className="m-0 border-l-2 border-border py-1 pl-5 text-left"
          >
            <Textarea
              aria-label="Testimonial quote"
              rows={4}
              spellCheck={false}
              className={`${inputClassName} min-h-0 resize-none overflow-hidden text-left text-base leading-relaxed font-medium text-muted-foreground italic md:text-lg`}
              value={testimonial.content}
              onChange={(e) =>
                updateTestimonial(index, "content", e.target.value)
              }
            />

            <footer className="mt-4">
              <Input
                aria-label="Testimonial author"
                spellCheck={false}
                className={`${inputClassName} text-left text-sm leading-tight font-bold tracking-normal md:text-base`}
                value={testimonial.author}
                onChange={(e) =>
                  updateTestimonial(index, "author", e.target.value)
                }
              />
              <Input
                aria-label="Testimonial author role"
                spellCheck={false}
                className={`${inputClassName} mt-1 text-left text-xs leading-snug font-medium tracking-normal text-muted-foreground md:text-sm`}
                value={testimonial.role}
                onChange={(e) =>
                  updateTestimonial(index, "role", e.target.value)
                }
              />
            </footer>
          </blockquote>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
