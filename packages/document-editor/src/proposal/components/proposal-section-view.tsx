import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { CanvasTextArea, CanvasTextField } from "../../components/canvas-fields"
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
        <CanvasTextField
          aria-label="Section eyebrow"
          className="h-5 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase"
          placeholder="Eyebrow"
          value={String(node.attrs.eyebrow ?? "")}
          onValueChange={(eyebrow) => updateAttributes({ eyebrow })}
        />
        <CanvasTextArea
          aria-label="Section title"
          className="[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal"
          minRows={1}
          maxRows={3}
          placeholder="Section title"
          value={String(node.attrs.title ?? "")}
          onValueChange={(title) => updateAttributes({ title })}
        />
        <CanvasTextArea
          aria-label="Section lead"
          className="text-base leading-7 text-[var(--document-muted-foreground)]"
          minRows={1}
          maxRows={4}
          placeholder="Lead"
          value={String(node.attrs.lead ?? "")}
          onValueChange={(lead) => updateAttributes({ lead })}
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
