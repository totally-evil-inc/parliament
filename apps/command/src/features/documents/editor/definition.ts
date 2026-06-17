import type {
  DocumentBlockDefinition,
  DocumentDefinition,
  DocumentLayoutPreset,
} from "./types"
import type { EditorCommand } from "@/lib/editor/commands"
import type { Editor } from "@tiptap/react"
import type { Range } from "@tiptap/core"

import { insertDocumentBlock } from "@/features/documents/utils/insert-document-block"

type InsertFromDefinitionOptions = {
  editor: Editor
  definition: DocumentDefinition
  block: DocumentBlockDefinition
  layout?: DocumentLayoutPreset
  range?: Range
}

export function insertDocumentBlockFromDefinition({
  editor,
  definition,
  block,
  layout,
  range,
}: InsertFromDefinitionOptions) {
  if (block.singleton) {
    editor.commands.focus()
    return
  }

  insertDocumentBlock({
    editor,
    range,
    beforeNodeType: definition.insertPolicy?.beforeNodeType,
    block: {
      type: block.nodeType,
      attrs: layout?.attrs ?? block.defaultContent?.attrs,
      content: layout?.content ?? block.defaultContent?.content,
    },
  })
}

export function createDocumentCommands(
  definition: DocumentDefinition
): Array<EditorCommand> {
  return definition.blocks
    .filter((block) => block.showInSlashMenu || block.showInFloatingMenu)
    .map((block) => ({
      id: block.id,
      title: block.label,
      description: block.description,
      searchTerms: block.searchTerms,
      icon: block.icon,
      group: "block",
      showInSlashMenu: block.showInSlashMenu,
      showInFloatingMenu: block.showInFloatingMenu,
      command: ({ editor, range }) => {
        insertDocumentBlockFromDefinition({
          editor,
          definition,
          block,
          range,
        })
      },
    }))
}
