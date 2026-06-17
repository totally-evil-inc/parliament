import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
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

            <Textarea
              className="min-h-0 w-full resize-none overflow-hidden rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-xl leading-relaxed font-medium italic shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
              value={testimonial.content}
              rows={2}
              onChange={(e) => {
                updateTestimonial(index, "content", e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              onFocus={(e) => {
                e.target.style.height = "auto"
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
            />

            <div className="space-y-1">
              <Input
                className="h-auto rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-base font-bold shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
                value={testimonial.author}
                onChange={(e) =>
                  updateTestimonial(index, "author", e.target.value)
                }
              />
              <Input
                className="h-auto rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-center text-xs tracking-widest text-muted-foreground uppercase shadow-none hover:border-border focus-visible:border-border focus-visible:ring-0"
                value={testimonial.role}
                onChange={(e) =>
                  updateTestimonial(index, "role", e.target.value)
                }
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeTestimonial(index)}
              className="absolute top-0 -right-2 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive/80"
              aria-label="Remove testimonial"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
