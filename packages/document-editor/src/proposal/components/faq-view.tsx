import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { CanvasTextArea } from "../../components/canvas-fields"
import { useDocumentEditorHost } from "../../runtime/react"
import { RichTextDocEditor } from "./rich-text-doc-editor"

type FaqItem = {
  id: string
  question: string
  answer: RichTextDoc
}

function richDoc(value: unknown): RichTextDoc {
  if (
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as RichTextDoc
  }
  return { type: "doc", content: [] }
}

function items(value: unknown): Array<FaqItem> {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => ({
    id:
      item && typeof item.id === "string" && item.id
        ? item.id
        : `faq-item-${index}`,
    question: item && typeof item.question === "string" ? item.question : "",
    answer: richDoc(item && typeof item === "object" ? item.answer : null),
  }))
}

export function FaqView({ node, updateAttributes }: NodeViewProps) {
  const { confirm, createId } = useDocumentEditorHost()
  const faqItems = items(node.attrs.items)

  const updateItem = (index: number, patch: Partial<FaqItem>) => {
    updateAttributes({
      items: faqItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    })
  }

  const addItem = () => {
    updateAttributes({
      items: [
        ...faqItems,
        {
          id: createId("faq-item"),
          question: "New question",
          answer: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Add the answer here." }],
              },
            ],
          },
        },
      ],
    })
  }

  const removeItem = async (index: number) => {
    const confirmed = await confirm({
      title: "Remove question?",
      description: "This will remove the selected FAQ item.",
      confirmLabel: "Remove question",
      variant: "destructive",
    })
    if (!confirmed) return
    updateAttributes({
      items: faqItems.filter((_, itemIndex) => itemIndex !== index),
    })
  }

  return (
    <NodeViewWrapper
      className="proposal-faq my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--document-border)] pb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase">
            FAQ
          </p>
          <h3 className="mt-1 [font-family:var(--document-heading-font-family)] text-2xl font-bold tracking-normal">
            Common Questions
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="h-8 gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      <div className="divide-y divide-[var(--document-border)]">
        {faqItems.map((item, index) => (
          <div key={item.id} className="group py-5 first:pt-0">
            <div className="flex items-start gap-3">
              <CanvasTextArea
                aria-label="FAQ question"
                className="text-base leading-6 font-semibold"
                minRows={1}
                maxRows={3}
                placeholder="Question"
                value={item.question}
                onValueChange={(question) => updateItem(index, { question })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void removeItem(index)}
                className="mt-0.5 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove FAQ item"
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
              </Button>
            </div>
            <RichTextDocEditor
              className="mt-2 text-sm text-[var(--document-muted-foreground)]"
              content={item.answer}
              onChange={(answer) => updateItem(index, { answer })}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
