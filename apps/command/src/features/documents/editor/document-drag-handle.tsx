import DragHandle from "@tiptap/extension-drag-handle-react"
import type { DragHandleRule } from "@tiptap/extension-drag-handle"
import type { Editor } from "@tiptap/react"

const proposalDragHandleRules: Array<DragHandleRule> = [
  {
    id: "topLevelOnly",
    evaluate: ({ depth }) => (depth > 1 ? 1000 : 0),
  },
  {
    id: "excludeFixedProposalNodes",
    evaluate: ({ node }) =>
      node.type.name === "documentHeader" || node.type.name === "lineItems"
        ? 1000
        : 0,
  },
]

type DocumentDragHandleProps = {
  editor: Editor
}

export function DocumentDragHandle({ editor }: DocumentDragHandleProps) {
  return (
    <DragHandle
      editor={editor}
      computePositionConfig={{
        placement: "left-start",
        strategy: "fixed",
      }}
      nested={{
        defaultRules: true,
        edgeDetection: "left",
        rules: proposalDragHandleRules,
      }}
    >
      <button
        aria-label="Drag block"
        className="document-drag-handle"
        contentEditable={false}
        type="button"
      />
    </DragHandle>
  )
}
