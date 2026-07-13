import type { NodeViewProps } from "@tiptap/react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"

const gridColumnClassNames = {
  1: "proposal-grid-cols-1",
  2: "proposal-grid-cols-2",
  3: "proposal-grid-cols-3",
} as const

function columns(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2) return value
  return 3
}

export function TeamMembersView({ node }: NodeViewProps) {
  const columnCount = columns(node.attrs.columns)

  return (
    <NodeViewWrapper
      className={`team-members proposal-grid-block ${gridColumnClassNames[columnCount]} my-[var(--document-section-spacing)] w-full outline-none`}
    >
      <NodeViewContent className="proposal-grid-content" />
    </NodeViewWrapper>
  )
}
