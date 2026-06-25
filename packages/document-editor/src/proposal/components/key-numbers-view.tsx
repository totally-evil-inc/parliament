import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Node } from "@tiptap/core"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useActiveEditorContext } from "../../runtime/react"
import { KeyNumbersValue, KeyNumbersLabel, KeyNumbersDetail } from "../extensions/key-numbers"

const CardDocument = Node.create({
  name: "doc",
  topNode: true,
})

export function KeyNumbersView({ node, updateAttributes }: NodeViewProps) {
  const context = useActiveEditorContext()
  const columns = node.attrs.columns ?? 3
  const items = node.attrs.items ?? []

  const updateItem = (index: number, updatedItem: any) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    updateAttributes({ items: newItems })
  }

  const gridStyles = {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "3rem 2.5rem",
    width: "100%",
    margin: "2.5rem 0",
  }

  const cardWidth = columns === 1
    ? "100%"
    : columns === 2
      ? "calc(50% - 1.25rem)"
      : "calc(33.333% - 1.666rem)"

  return (
    <NodeViewWrapper className="key-numbers my-[var(--document-section-spacing)] outline-none" data-drag-handle="">
      <div style={gridStyles}>
        {items.map((item: any, index: number) => (
          <div
            key={item.id || index}
            style={{ flex: `0 0 ${cardWidth}`, maxWidth: cardWidth }}
            className="p-6 rounded-xl"
          >
            <KeyNumberCardEditor
              item={item}
              onUpdate={(updated) => updateItem(index, updated)}
              setActiveEditor={context?.setActiveEditor ?? (() => {})}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}

type CardEditorProps = {
  item: any
  onUpdate: (item: any) => void
  setActiveEditor: (editor: any) => void
}

function KeyNumberCardEditor({ item, onUpdate, setActiveEditor }: CardEditorProps) {
  const onUpdateRef = React.useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const editor = useEditor({
    extensions: [
      CardDocument.extend({
        content: "keyNumbersValue keyNumbersLabel keyNumbersDetail",
      }),
      StarterKit.configure({
        document: false,
      }),
      KeyNumbersValue,
      KeyNumbersLabel,
      KeyNumbersDetail,
    ],
    content: {
      type: "doc",
      content: [
        { type: "keyNumbersValue", content: item.value?.content ?? [] },
        { type: "keyNumbersLabel", content: item.label?.content ?? [] },
        { type: "keyNumbersDetail", content: item.detail?.content ?? [] },
      ],
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      const json = editor.getJSON()
      const value = json.content?.find((c: any) => c.type === "keyNumbersValue") ?? { type: "keyNumbersValue" }
      const label = json.content?.find((c: any) => c.type === "keyNumbersLabel") ?? { type: "keyNumbersLabel" }
      const detail = json.content?.find((c: any) => c.type === "keyNumbersDetail") ?? { type: "keyNumbersDetail" }
      onUpdateRef.current({
        ...item,
        value: { type: "doc", content: value.content ?? [] },
        label: { type: "doc", content: label.content ?? [] },
        detail: { type: "doc", content: detail.content ?? [] },
      })
    },
    onFocus({ editor }) {
      setActiveEditor(editor)
    },
  }, [])

  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const expected = {
      type: "doc",
      content: [
        { type: "keyNumbersValue", content: item.value?.content ?? [] },
        { type: "keyNumbersLabel", content: item.label?.content ?? [] },
        { type: "keyNumbersDetail", content: item.detail?.content ?? [] },
      ],
    }
    const current = editor.getJSON()
    if (JSON.stringify(current.content) !== JSON.stringify(expected.content)) {
      editor.commands.setContent(expected, false)
    }
  }, [editor, item])

  return <EditorContent editor={editor} className="outline-none [&_.tiptap]:outline-none" />
}
