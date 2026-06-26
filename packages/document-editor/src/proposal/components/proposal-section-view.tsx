import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { RichTextDocEditor } from "./rich-text-doc-editor"

const variantClassNames = {
  default: "",
  accent:
    "rounded-[var(--document-radius)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-8",
  compact: "border-t border-[var(--document-border)] pt-8",
} as const

function sectionVariant(value: unknown): keyof typeof variantClassNames {
  return value === "accent" || value === "compact" ? value : "default"
}

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
  return { type: "doc", content: [] }
}

export function ProposalSectionView({ node, updateAttributes }: NodeViewProps) {
  const variant = sectionVariant(node.attrs.variant)
  const eyebrow = richDoc(node.attrs.eyebrow)
  const title = richDoc(node.attrs.title)
  const lead = richDoc(node.attrs.lead)
  const content = richDoc(node.attrs.content)

  return (
    <NodeViewWrapper
      className={[
        "proposal-section my-[var(--document-section-spacing)] text-[var(--document-foreground)]",
        variantClassNames[variant],
      ].join(" ")}
      data-drag-handle=""
    >
      <div className="space-y-3">
        <RichTextDocEditor
          className="h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
          content={eyebrow}
          inline
          onChange={(nextEyebrow) => updateAttributes({ eyebrow: nextEyebrow })}
        />
        <RichTextDocEditor
          className="[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
          content={title}
          inline
          onChange={(nextTitle) => updateAttributes({ title: nextTitle })}
        />
        <RichTextDocEditor
          className="text-base leading-7 text-[var(--document-muted-foreground)]"
          content={lead}
          inline
          onChange={(nextLead) => updateAttributes({ lead: nextLead })}
        />
      </div>
      <RichTextDocEditor
        className="mt-5 text-sm text-[var(--document-foreground)]"
        content={content}
        onChange={(nextContent) => updateAttributes({ content: nextContent })}
      />
    </NodeViewWrapper>
  )
}
