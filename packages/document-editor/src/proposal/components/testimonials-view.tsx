import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { EmbeddedCardEditor } from "./embedded-card-editor"
import {
  TestimonialQuote,
  TestimonialAuthor,
  TestimonialRole,
} from "../extensions/testimonials"

export function TestimonialsView({ node, updateAttributes }: NodeViewProps) {
  const columns = node.attrs.columns ?? 3
  const items = node.attrs.items ?? []

  const updateItem = (index: number, updatedItem: any) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    updateAttributes({ items: newItems })
  }

  const gridStyles = {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "3rem 2.5rem",
    width: "100%",
    margin: "2.5rem 0",
  }

  const cardWidth =
    columns === 1
      ? "100%"
      : columns === 2
        ? "calc(50% - 1.25rem)"
        : "calc(33.333% - 1.666rem)"

  return (
    <NodeViewWrapper
      className="testimonials my-[var(--document-section-spacing)] outline-none"
      data-drag-handle=""
    >
      <div style={gridStyles}>
        {items.map((item: any, index: number) => (
          <div
            key={item.id || index}
            style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
          >
            <blockquote className="m-0 flex h-full flex-col rounded-r-md border-l-2 border-[var(--document-accent)] bg-card/30 py-1 pl-5 text-left">
              <EmbeddedCardEditor
                extensions={[
                  TestimonialQuote,
                  TestimonialAuthor,
                  TestimonialRole,
                ]}
                fields={[
                  { key: "quote", nodeType: "testimonialQuote" },
                  { key: "author", nodeType: "testimonialAuthor" },
                  { key: "role", nodeType: "testimonialRole" },
                ]}
                item={item}
                onUpdate={(updated) => updateItem(index, updated)}
              />
            </blockquote>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
