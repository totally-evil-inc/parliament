import { NodeViewWrapper } from "@tiptap/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon, QuillWrite02Icon } from "@hugeicons/core-free-icons"
import type { NodeViewProps } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { RichTextDocEditor } from "./rich-text-doc-editor"
import { getArrayAttr, getColumnCount } from "../types"

type RichTextItem = {
  id: string
  heading?: RichTextDoc
  body?: RichTextDoc
  title?: RichTextDoc
  image?: { assetId: string; alt: string }
}

const emptyDoc: RichTextDoc = { type: "doc", content: [] }

const gridColumnClassNames = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
} as const

function richDoc(value: unknown): RichTextDoc {
  if (typeof value === "string") {
    return {
      type: "doc",
      content: value ? [{ type: "text", text: value }] : [],
    }
  }
  if (
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as RichTextDoc
  }
  return emptyDoc
}

function narrativeColumns(value: unknown): 2 | 3 {
  return value === 2 ? 2 : 3
}

function updateItem(
  items: Array<RichTextItem>,
  index: number,
  patch: Partial<RichTextItem>
) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item
  )
}

function ImagePlaceholder({ label = "Image" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_55%,transparent)]">
      <HugeiconsIcon icon={Image01Icon} className="h-8 w-8" />
      <span className="text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </span>
    </div>
  )
}

export function ProposalCoverView({ node, updateAttributes }: NodeViewProps) {
  const variant = node.attrs.variant === "band" ? "band" : node.attrs.variant
  const split = variant !== "minimal"

  return (
    <NodeViewWrapper
      className="proposal-cover my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <div
        className={[
          "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-8",
          split ? "grid gap-8 md:grid-cols-[1.2fr_0.8fr]" : "",
        ].join(" ")}
      >
        <div className="space-y-4">
          <RichTextDocEditor
            className="h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
            content={richDoc(node.attrs.eyebrow)}
            inline
            onChange={(eyebrow) => updateAttributes({ eyebrow })}
          />
          <RichTextDocEditor
            className="[font-family:var(--document-heading-font-family)] text-4xl leading-tight font-bold tracking-normal"
            content={richDoc(node.attrs.title)}
            inline
            onChange={(title) => updateAttributes({ title })}
          />
          <RichTextDocEditor
            className="max-w-2xl text-base leading-7 text-[var(--document-muted-foreground)]"
            content={richDoc(node.attrs.subtitle)}
            inline
            onChange={(subtitle) => updateAttributes({ subtitle })}
          />
        </div>
        {split ? <ImagePlaceholder label="Cover image" /> : null}
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalColumnsView({ node, updateAttributes }: NodeViewProps) {
  const columns = narrativeColumns(node.attrs.columns)
  const items = getArrayAttr<RichTextItem>(node.attrs.items)

  return (
    <NodeViewWrapper
      className="proposal-columns my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <RichTextDocEditor
        className="[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
        content={richDoc(node.attrs.title)}
        inline
        onChange={(title) => updateAttributes({ title })}
      />
      <div className={`mt-6 grid gap-5 ${gridColumnClassNames[columns]}`}>
        {items.map((item, index) => (
          <section
            key={item.id}
            className="break-inside-avoid border-t border-[var(--document-border)] pt-4"
          >
            <RichTextDocEditor
              className="text-base font-semibold"
              content={richDoc(item.heading)}
              inline
              onChange={(heading) =>
                updateAttributes({
                  items: updateItem(items, index, { heading }),
                })
              }
            />
            <RichTextDocEditor
              className="mt-2 text-sm text-[var(--document-muted-foreground)]"
              content={richDoc(item.body)}
              onChange={(body) =>
                updateAttributes({ items: updateItem(items, index, { body }) })
              }
            />
          </section>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalImageTextView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const reverse = node.attrs.reverse === true

  return (
    <NodeViewWrapper
      className="proposal-image-text my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <div
        className={[
          "grid gap-8 md:grid-cols-2 md:items-center",
          reverse ? "md:[&>*:first-child]:order-2" : "",
        ].join(" ")}
      >
        <ImagePlaceholder />
        <div>
          <RichTextDocEditor
            className="h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
            content={richDoc(node.attrs.eyebrow)}
            inline
            onChange={(eyebrow) => updateAttributes({ eyebrow })}
          />
          <RichTextDocEditor
            className="mt-2 [font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
            content={richDoc(node.attrs.title)}
            inline
            onChange={(title) => updateAttributes({ title })}
          />
          <RichTextDocEditor
            className="mt-4 text-sm text-[var(--document-foreground)]"
            content={richDoc(node.attrs.content)}
            onChange={(content) => updateAttributes({ content })}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalImageCardsView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const columns = getColumnCount(node.attrs.columns)
  const items = getArrayAttr<RichTextItem>(node.attrs.items)
  const horizontal = node.attrs.variant === "horizontal"

  return (
    <NodeViewWrapper
      className="proposal-image-cards my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <div className={`grid gap-4 ${gridColumnClassNames[columns]}`}>
        {items.map((item, index) => (
          <section
            key={item.id}
            className={[
              "break-inside-avoid rounded-[var(--document-radius)] border border-[var(--document-border)] p-4",
              horizontal ? "grid gap-4 md:grid-cols-[7rem_1fr]" : "space-y-4",
            ].join(" ")}
          >
            <ImagePlaceholder label={item.image?.alt || "Image"} />
            <div>
              <RichTextDocEditor
                className="text-base font-semibold"
                content={richDoc(item.title)}
                inline
                onChange={(title) =>
                  updateAttributes({
                    items: updateItem(items, index, { title }),
                  })
                }
              />
              <RichTextDocEditor
                className="mt-2 text-sm text-[var(--document-muted-foreground)]"
                content={richDoc(item.body)}
                onChange={(body) =>
                  updateAttributes({
                    items: updateItem(items, index, { body }),
                  })
                }
              />
            </div>
          </section>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalSignatureView({
  node,
  updateAttributes,
}: NodeViewProps) {
  return (
    <NodeViewWrapper
      className="proposal-signature my-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      data-drag-handle=""
    >
      <section className="grid gap-8 border-t border-[var(--document-border)] pt-8 md:grid-cols-[1fr_16rem]">
        <div>
          <RichTextDocEditor
            className="[font-family:var(--document-heading-font-family)] text-2xl leading-tight font-bold tracking-normal"
            content={richDoc(node.attrs.title)}
            inline
            onChange={(title) => updateAttributes({ title })}
          />
          <RichTextDocEditor
            className="mt-3 text-sm text-[var(--document-muted-foreground)]"
            content={richDoc(node.attrs.terms)}
            onChange={(terms) => updateAttributes({ terms })}
          />
        </div>
        <div className="flex min-h-28 flex-col justify-end border-t border-[var(--document-border)] pt-4 text-right">
          <HugeiconsIcon
            icon={QuillWrite02Icon}
            className="ml-auto h-7 w-7 text-[var(--document-muted-foreground)]"
          />
          <p className="mt-3 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
            Signer from pricing
          </p>
        </div>
      </section>
    </NodeViewWrapper>
  )
}
