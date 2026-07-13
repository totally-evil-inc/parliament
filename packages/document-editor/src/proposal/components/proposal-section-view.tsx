import type { NodeViewProps } from "@tiptap/react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"

const variantClassNames = {
  default: "",
  accent:
    "rounded-[var(--document-radius)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-8",
  compact: "border-t border-[var(--document-border)] pt-8",
} as const

function sectionVariant(value: unknown): keyof typeof variantClassNames {
  return value === "accent" || value === "compact" ? value : "default"
}

export function ProposalSectionView({ node }: NodeViewProps) {
  const variant = sectionVariant(node.attrs.variant)

  return (
    <NodeViewWrapper
      className={[
        "proposal-section my-[var(--document-section-spacing)] text-[var(--document-foreground)]",
        variantClassNames[variant],
      ].join(" ")}
    >
      <NodeViewContent className="space-y-3" />
    </NodeViewWrapper>
  )
}
