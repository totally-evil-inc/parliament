import { PencilSquareIcon, PhotoIcon } from "@heroicons/react/24/outline"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import { getColumnCount } from "../types"

const gridColumnClassNames = {
  1: "proposal-grid-cols-1",
  2: "proposal-grid-cols-2",
  3: "proposal-grid-cols-3",
} as const

function narrativeColumns(value: unknown): 2 | 3 {
  return value === 2 ? 2 : 3
}

function ImagePlaceholder({ label = "Image" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_55%,transparent)]">
      <PhotoIcon className="h-8 w-8" />
      <span className="font-semibold text-[10px] uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

export function ProposalCoverView({ node }: NodeViewProps) {
  const variant = node.attrs.variant === "band" ? "band" : node.attrs.variant
  const split = variant !== "minimal"

  return (
    <NodeViewWrapper className="proposal-cover my-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      <div
        className={[
          "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-8",
          split ? "grid gap-8 md:grid-cols-[1.2fr_0.8fr]" : "",
        ].join(" ")}
      >
        <NodeViewContent className="space-y-4" />
        {split ? <ImagePlaceholder label="Cover image" /> : null}
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalColumnsView({ node }: NodeViewProps) {
  const columns = narrativeColumns(node.attrs.columns)

  return (
    <NodeViewWrapper
      className={`proposal-columns proposal-grid-block ${gridColumnClassNames[columns]} my-[var(--document-section-spacing)] w-full text-[var(--document-foreground)]`}
    >
      <NodeViewContent className="proposal-grid-content proposal-columns-content" />
    </NodeViewWrapper>
  )
}

export function ProposalImageTextView({ node }: NodeViewProps) {
  const reverse = node.attrs.reverse === true

  return (
    <NodeViewWrapper className="proposal-image-text my-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      <div
        className={[
          "grid gap-8 md:grid-cols-2 md:items-center",
          reverse ? "md:[&>*:first-child]:order-2" : "",
        ].join(" ")}
      >
        <ImagePlaceholder />
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  )
}

export function ProposalImageCardsView({ node }: NodeViewProps) {
  const columns = getColumnCount(node.attrs.columns)
  const horizontal = node.attrs.variant === "horizontal"

  return (
    <NodeViewWrapper
      className={[
        `proposal-image-cards proposal-grid-block ${gridColumnClassNames[columns]} my-[var(--document-section-spacing)] w-full text-[var(--document-foreground)]`,
        horizontal ? "proposal-image-cards-horizontal" : "",
      ].join(" ")}
    >
      <NodeViewContent className="proposal-grid-content proposal-image-cards-content" />
    </NodeViewWrapper>
  )
}

export function ProposalSignatureView() {
  return (
    <NodeViewWrapper className="proposal-signature my-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      <section className="grid gap-8 border-[var(--document-border)] border-t pt-8 md:grid-cols-[1fr_16rem]">
        <NodeViewContent />
        <div className="flex min-h-28 flex-col justify-end border-[var(--document-border)] border-t pt-4 text-right">
          <PencilSquareIcon className="ml-auto h-7 w-7 text-[var(--document-muted-foreground)]" />
          <p className="mt-3 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
            Signer from pricing
          </p>
        </div>
      </section>
    </NodeViewWrapper>
  )
}
