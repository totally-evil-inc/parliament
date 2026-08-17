import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import type { DragHandleRule } from "@tiptap/extension-drag-handle"
import DragHandle from "@tiptap/extension-drag-handle-react"
import type { Editor } from "@tiptap/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import * as React from "react"
import type { EditorCommand } from "../../commands/types"

import {
  editorCommandsForSurface,
  filterEditorCommands,
} from "../../commands/types"
import { SlashCommandList } from "./slash-command"

export function DocumentDragHandle({
  commands,
  editor,
  protectedNodeTypes = [],
}: {
  commands: Array<EditorCommand>
  editor: Editor
  protectedNodeTypes?: Array<string>
}) {
  const activePosRef = React.useRef<number | null>(null)
  const [insertMenuOpen, setInsertMenuOpen] = React.useState(false)

  const rules = React.useMemo<Array<DragHandleRule>>(
    () => [
      { id: "topLevelOnly", evaluate: ({ depth }) => (depth > 1 ? 1000 : 0) },
      {
        id: "excludeProtectedNodes",
        evaluate: ({ node }) =>
          protectedNodeTypes.includes(node.type.name) ? 1000 : 0,
      },
    ],
    [protectedNodeTypes]
  )

  React.useEffect(() => {
    editor.commands.setMeta("lockDragHandle", insertMenuOpen)
  }, [editor, insertMenuOpen])

  const deleteActive = () => {
    const pos = activePosRef.current
    if (pos === null || !editor.state.doc.nodeAt(pos)) return
    editor.chain().focus().setNodeSelection(pos).deleteSelection().run()
    activePosRef.current = null
  }

  const insertAfterActive = (command: EditorCommand) => {
    const pos = activePosRef.current
    const node = pos === null ? null : editor.state.doc.nodeAt(pos)
    setInsertMenuOpen(false)
    if (pos === null || !node) return
    window.requestAnimationFrame(() => {
      if (command.insertionTarget === "document")
        return command.command({ editor })
      const insertPos = pos + node.nodeSize
      if (
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, { type: "paragraph" })
          .setTextSelection(insertPos + 1)
          .run()
      ) {
        command.command({ editor })
      }
    })
  }

  const preventDrag = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }
  const setDraggable = (
    event: React.PointerEvent<HTMLButtonElement>,
    value: boolean
  ) => {
    const controls = event.currentTarget.closest<HTMLElement>(
      ".document-block-controls"
    )
    if (controls) controls.draggable = value
  }
  const nodeChange = ({ node, pos }: { node: unknown | null; pos: number }) => {
    if (node) activePosRef.current = pos
  }

  return (
    <>
      <DragHandle
        className="document-block-controls document-block-controls-left hidden md:flex"
        editor={editor}
        pluginKey="document-drag-handle"
        computePositionConfig={{
          placement: "left-start",
          strategy: "absolute",
        }}
        nested={{ defaultRules: true, edgeDetection: "left", rules }}
        onNodeChange={nodeChange}
      >
        <button
          aria-label="Drag block"
          className="document-block-control document-block-drag-control"
          contentEditable={false}
          title="Drag block"
          type="button"
        >
          <span aria-hidden="true" className="document-drag-handle-grip" />
        </button>
        <Popover open={insertMenuOpen} onOpenChange={setInsertMenuOpen}>
          <PopoverTrigger
            render={
              <button
                aria-label="Insert block"
                className="document-block-control document-block-insert-control"
                contentEditable={false}
                draggable={false}
                onDragStart={preventDrag}
                onPointerEnter={(event) => setDraggable(event, false)}
                onPointerLeave={(event) => setDraggable(event, !insertMenuOpen)}
                title="Insert block"
                type="button"
              />
            }
          >
            <PlusIcon className="size-4" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto gap-0 p-0"
            side="bottom"
          >
            <SlashCommandList
              command={insertAfterActive}
              items={filterEditorCommands(
                "",
                editorCommandsForSurface(commands, "floating")
              )}
            />
          </PopoverContent>
        </Popover>
      </DragHandle>
      <DragHandle
        className="document-block-controls document-block-controls-right hidden md:flex"
        editor={editor}
        pluginKey="document-delete-handle"
        computePositionConfig={{
          placement: "right-start",
          strategy: "absolute",
        }}
        nested={{ defaultRules: true, edgeDetection: "left", rules }}
        onNodeChange={nodeChange}
      >
        <button
          aria-label="Delete block"
          className="document-block-control document-block-delete-control"
          contentEditable={false}
          draggable={false}
          onClick={deleteActive}
          onDragStart={preventDrag}
          onPointerEnter={(event) => setDraggable(event, false)}
          onPointerLeave={(event) => setDraggable(event, true)}
          title="Delete block"
          type="button"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </DragHandle>
    </>
  )
}
