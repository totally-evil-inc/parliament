import * as React from "react"
import { Node } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { AnyExtension, JSONContent } from "@tiptap/core"
import type { RichTextDoc } from "@workspace/document/schema"
import { useDocumentEditorChrome } from "../../runtime/react"

export type CardFieldDocument = RichTextDoc

export type CardItem = {
  id: string
  sourceId?: string
  [field: string]: string | CardFieldDocument | undefined
}

export type CardField = {
  key: string
  nodeType: string
}

const EmbeddedDocument = Node.create({
  name: "doc",
  topNode: true,
})

export function textField(value: string): CardFieldDocument {
  return {
    type: "doc",
    content: value ? [{ type: "text", text: value }] : [],
  }
}

export function EmbeddedCardEditor({
  extensions,
  fields,
  item,
  onUpdate,
}: {
  extensions: Array<AnyExtension>
  fields: Array<CardField>
  item: CardItem
  onUpdate: (item: CardItem) => void
}) {
  const chrome = useDocumentEditorChrome()
  const chromeRef = React.useRef(chrome)
  const itemRef = React.useRef(item)
  const onUpdateRef = React.useRef(onUpdate)
  chromeRef.current = chrome
  itemRef.current = item
  onUpdateRef.current = onUpdate

  const editor = useEditor(
    {
      extensions: [
        EmbeddedDocument.extend({
          content: fields.map((field) => field.nodeType).join(" "),
        }),
        StarterKit.configure({ document: false }),
        ...extensions,
      ],
      content: cardEditorContent(item, fields),
      immediatelyRender: false,
      onUpdate: ({ editor: currentEditor }) => {
        const content = currentEditor.getJSON().content ?? []
        const updatedItem: CardItem = { ...itemRef.current }

        for (const field of fields) {
          const fieldNode = content.find((node) => node.type === field.nodeType)
          updatedItem[field.key] = {
            type: "doc",
            content: fieldNode?.content ?? [],
          }
        }

        onUpdateRef.current(updatedItem)
      },
      onFocus: ({ editor: currentEditor }) => {
        chromeRef.current?.activateTextEditor(currentEditor)
      },
    },
    []
  )

  React.useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return

    const expected = cardEditorContent(item, fields)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(expected)) {
      editor.commands.setContent(expected, { emitUpdate: false })
    }
  }, [editor, fields, item])

  React.useEffect(() => {
    if (!editor || !chrome) return

    return () => {
      chrome.clearTextEditor(editor)
    }
  }, [chrome, editor])

  return <EditorContent editor={editor} />
}

function cardEditorContent(
  item: CardItem,
  fields: Array<CardField>
): JSONContent {
  return {
    type: "doc",
    content: fields.map((field) => ({
      type: field.nodeType,
      content: fieldContent(item[field.key]),
    })),
  }
}

function fieldContent(value: CardItem[string]): Array<JSONContent> {
  if (!value || typeof value === "string") return []
  return value.content as Array<JSONContent>
}
