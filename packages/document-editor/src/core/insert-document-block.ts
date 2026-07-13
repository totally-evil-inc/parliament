import type { InsertDocumentBlockOptions } from "./types"

const EDITABLE_SPACER = { type: "paragraph" }

function findTopLevelNodePosition(
  editor: InsertDocumentBlockOptions["editor"],
  type: string
) {
  let position = 0

  for (let index = 0; index < editor.state.doc.childCount; index += 1) {
    const child = editor.state.doc.child(index)

    if (child.type.name === type) return position

    position += child.nodeSize
  }

  return null
}

export function insertDocumentBlock({
  editor,
  block,
  range,
  beforeNodeType,
  spacer = EDITABLE_SPACER,
}: InsertDocumentBlockOptions) {
  if (range) {
    editor.chain().focus().deleteRange(range).run()
  }

  const insertionPosition = beforeNodeType
    ? findTopLevelNodePosition(editor, beforeNodeType)
    : null

  if (insertionPosition === null) {
    editor.chain().focus().insertContent([block, spacer]).run()
    return
  }

  editor
    .chain()
    .focus()
    .insertContentAt(insertionPosition, [block, spacer])
    .run()
}
