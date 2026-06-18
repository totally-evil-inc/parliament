import * as React from "react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
  const activePosRef = React.useRef<number | null>(null)

  const handleNodeChange = React.useCallback(
    ({ node, pos }: { node: unknown | null; pos: number }) => {
      if (!node) return

      activePosRef.current = pos
    },
    []
  )

  const handleDelete = React.useCallback(() => {
    const activePos = activePosRef.current

    if (activePos === null) return

    const node = editor.state.doc.nodeAt(activePos)

    if (!node) return

    editor
      .chain()
      .focus()
      .setNodeSelection(activePos)
      .deleteSelection()
      .run()

    activePosRef.current = null
  }, [editor])

  return (
    <>
      <DragHandle
        className="document-drag-handle"
        editor={editor}
        pluginKey="proposal-drag-handle"
        computePositionConfig={{
          placement: "left-start",
          strategy: "absolute",
        }}
        nested={{
          defaultRules: true,
          edgeDetection: "left",
          rules: proposalDragHandleRules,
        }}
        onNodeChange={handleNodeChange}
      >
        <button
          aria-label="Drag block"
          className="document-drag-handle-button"
          contentEditable={false}
          type="button"
        >
          <span aria-hidden="true" className="document-drag-handle-grip" />
        </button>
      </DragHandle>
      <DragHandle
        className="document-delete-handle"
        editor={editor}
        pluginKey="proposal-delete-handle"
        computePositionConfig={{
          placement: "right-start",
          strategy: "absolute",
        }}
        nested={{
          defaultRules: true,
          edgeDetection: "left",
          rules: proposalDragHandleRules,
        }}
        onNodeChange={handleNodeChange}
      >
        <button
          aria-label="Delete block"
          className="document-delete-handle-button"
          contentEditable={false}
          onClick={handleDelete}
          type="button"
        >
          <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
        </button>
      </DragHandle>
    </>
  )
}
