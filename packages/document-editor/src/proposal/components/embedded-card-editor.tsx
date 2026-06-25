import * as React from "react"
import { Node } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { AnyExtension, JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { useActiveEditorContext } from "../../runtime/react"

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
  const activeEditorContext = useActiveEditorContext()
  const setActiveEditor = activeEditorContext?.setActiveEditor
  const itemRef = React.useRef(item)
  const onUpdateRef = React.useRef(onUpdate)
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
        setActiveEditor?.(currentEditor)
      },
    },
    []
  )

  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const expected = cardEditorContent(item, fields)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(expected)) {
      editor.commands.setContent(expected, { emitUpdate: false })
    }
  }, [editor, fields, item])

  React.useEffect(() => {
    if (!editor || !setActiveEditor) return

    return () => {
      setActiveEditor((current: Editor | null) =>
        current === editor ? null : current
      )
    }
  }, [editor, setActiveEditor])

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
