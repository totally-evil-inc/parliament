import type {
  DocumentDefinition,
  DocumentLayoutPreset,
  InsertableDocumentBlockDefinition,
  SingletonDocumentBlockDefinition,
} from "./types"
import type { EditorCommand } from "../commands/types"
import type { Editor } from "@tiptap/react"
import type { Range } from "@tiptap/core"

import { insertDocumentBlock } from "./insert-document-block"

type InsertFromDefinitionOptions = {
  editor: Editor
  definition: DocumentDefinition
  block: InsertableDocumentBlockDefinition | SingletonDocumentBlockDefinition
  layout?: DocumentLayoutPreset
  range?: Range
}

function findTopLevelNodePosition(editor: Editor, type: string) {
  let position = 0

  for (let index = 0; index < editor.state.doc.childCount; index += 1) {
    const child = editor.state.doc.child(index)

    if (child.type.name === type) return position

    position += child.nodeSize
  }

  return null
}

function focusSingletonBlock(
  editor: Editor,
  block: SingletonDocumentBlockDefinition
) {
  const position = findTopLevelNodePosition(editor, block.nodeType)

  if (position === null) {
    return false
  }

  editor.chain().focus().setNodeSelection(position).run()
  return true
}

export function insertDocumentBlockFromDefinition({
  editor,
  definition,
  block,
  layout,
  range,
}: InsertFromDefinitionOptions) {
  if (block.kind === "singleton") {
    if (focusSingletonBlock(editor, block)) {
      return
    }

    if (!block.createContent) {
      editor.commands.focus()
      return
    }

    insertDocumentBlock({
      editor,
      range,
      beforeNodeType: definition.insertPolicy?.beforeNodeType,
      block: block.createContent(layout),
    })
    return
  }

  insertDocumentBlock({
    editor,
    range,
    beforeNodeType: definition.insertPolicy?.beforeNodeType,
    block: block.createContent(layout),
  })
}

export function createDocumentCommands(
  definition: DocumentDefinition
): Array<EditorCommand> {
  const commands: Array<EditorCommand> = []

  for (const block of definition.blocks) {
    if (!block.showInSlashMenu && !block.showInFloatingMenu) {
      continue
    }

    commands.push({
      id: block.id,
      title: block.label,
      description: block.description,
      searchTerms: block.searchTerms,
      icon: block.icon,
      group: "block",
      showInSlashMenu: block.showInSlashMenu,
      showInFloatingMenu: block.showInFloatingMenu,
      insertionTarget: "document",
      command: ({ editor, range }) => {
        if (block.kind === "action") {
          block.command(editor)
          return
        }

        insertDocumentBlockFromDefinition({
          editor,
          definition,
          block,
          range,
        })
      },
    })
  }

  return commands
}
