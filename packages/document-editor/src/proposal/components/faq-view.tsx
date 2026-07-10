import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"

export function FaqView() {
  return (
    <NodeViewWrapper className="proposal-faq my-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      <div className="mb-6 border-b border-[var(--document-border)] pb-4">
        <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase">
          FAQ
        </p>
        <h3 className="mt-1 [font-family:var(--document-heading-font-family)] text-2xl font-bold tracking-normal">
          Common Questions
        </h3>
      </div>
      <NodeViewContent className="divide-y divide-[var(--document-border)]" />
    </NodeViewWrapper>
  )
}
