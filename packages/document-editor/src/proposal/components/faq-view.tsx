import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"

export function FaqView() {
  return (
    <NodeViewWrapper className="proposal-faq my-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      <div className="mb-6 border-[var(--document-border)] border-b pb-4">
        <p className="font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.18em]">
          FAQ
        </p>
        <h3 className="mt-1 font-bold text-2xl tracking-normal [font-family:var(--document-heading-font-family)]">
          Common Questions
        </h3>
      </div>
      <NodeViewContent className="divide-y divide-[var(--document-border)]" />
    </NodeViewWrapper>
  )
}
