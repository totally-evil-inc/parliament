import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

const EDITABLE_SPACER: JSONContent = { type: "paragraph" }

function findTopLevelNodePosition(editor: Editor, type: string) {
  let position = 0

  for (let index = 0; index < editor.state.doc.childCount; index += 1) {
    const child = editor.state.doc.child(index)

    if (child.type.name === type) return position

    position += child.nodeSize
  }

  return null
}

export function insertProposalBlock(editor: Editor, block: JSONContent) {
  const pricingTablePosition = findTopLevelNodePosition(editor, "pricingTable")

  if (pricingTablePosition === null) {
    editor.chain().focus().insertContent([block, EDITABLE_SPACER]).run()
    return
  }

  editor
    .chain()
    .focus()
    .insertContentAt(pricingTablePosition, [block, EDITABLE_SPACER])
    .run()
}
