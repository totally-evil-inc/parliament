import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Node } from "@tiptap/core"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useActiveEditorContext } from "../../runtime/react"
import { TestimonialQuote, TestimonialAuthor, TestimonialRole } from "../extensions/testimonials"

const CardDocument = Node.create({
  name: "doc",
  topNode: true,
})

export function TestimonialsView({ node, updateAttributes }: NodeViewProps) {
  const context = useActiveEditorContext()
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

  const cardWidth = columns === 1
    ? "100%"
    : columns === 2
      ? "calc(50% - 1.25rem)"
      : "calc(33.333% - 1.666rem)"

  return (
    <NodeViewWrapper className="testimonials my-[var(--document-section-spacing)] outline-none" data-drag-handle="">
      <div style={gridStyles}>
        {items.map((item: any, index: number) => (
          <div
            key={item.id || index}
            style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
          >
            <blockquote className="m-0 border-l-2 border-[var(--document-accent)] py-1 pl-5 text-left flex flex-col h-full bg-card/30 rounded-r-md">
              <TestimonialCardEditor
                item={item}
                onUpdate={(updated) => updateItem(index, updated)}
                setActiveEditor={context?.setActiveEditor ?? (() => {})}
              />
            </blockquote>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

type CardEditorProps = {
  item: any
  onUpdate: (item: any) => void
  setActiveEditor: (editor: any) => void
}

function TestimonialCardEditor({ item, onUpdate, setActiveEditor }: CardEditorProps) {
  const onUpdateRef = React.useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const editor = useEditor({
    extensions: [
      CardDocument.extend({
        content: "testimonialQuote testimonialAuthor testimonialRole",
      }),
      StarterKit.configure({
        document: false,
      }),
      TestimonialQuote,
      TestimonialAuthor,
      TestimonialRole,
    ],
    content: {
      type: "doc",
      content: [
        { type: "testimonialQuote", content: item.quote?.content ?? [] },
        { type: "testimonialAuthor", content: item.author?.content ?? [] },
        { type: "testimonialRole", content: item.role?.content ?? [] },
      ],
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      const json = editor.getJSON()
      const quote = json.content?.find((c: any) => c.type === "testimonialQuote") ?? { type: "testimonialQuote" }
      const author = json.content?.find((c: any) => c.type === "testimonialAuthor") ?? { type: "testimonialAuthor" }
      const role = json.content?.find((c: any) => c.type === "testimonialRole") ?? { type: "testimonialRole" }
      onUpdateRef.current({
        ...item,
        quote: { type: "doc", content: quote.content ?? [] },
        author: { type: "doc", content: author.content ?? [] },
        role: { type: "doc", content: role.content ?? [] },
      })
    },
    onFocus({ editor }) {
      setActiveEditor(editor)
    },
  }, [])

  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const expected = {
      type: "doc",
      content: [
        { type: "testimonialQuote", content: item.quote?.content ?? [] },
        { type: "testimonialAuthor", content: item.author?.content ?? [] },
        { type: "testimonialRole", content: item.role?.content ?? [] },
      ],
    }
    const current = editor.getJSON()
    if (JSON.stringify(current.content) !== JSON.stringify(expected.content)) {
      editor.commands.setContent(expected, false)
    }
  }, [editor, item])

  return <EditorContent editor={editor} className="outline-none [&_.tiptap]:outline-none" />
}
