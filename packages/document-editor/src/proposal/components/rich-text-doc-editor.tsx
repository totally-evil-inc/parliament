import * as React from "react"
import { Node } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { RichTextDoc } from "@workspace/document/schema"
import { useActiveEditorContext } from "../../runtime/react"

const EmbeddedDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block*",
})

export function RichTextDocEditor({
  className,
  content,
  onChange,
}: {
  className?: string
  content: RichTextDoc
  onChange: (content: RichTextDoc) => void
}) {
  const activeEditorContext = useActiveEditorContext()
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor(
    {
      extensions: [
        EmbeddedDocument,
        StarterKit.configure({
          document: false,
          heading: { levels: [2, 3] },
        }),
      ],
      content: content as JSONContent,
      immediatelyRender: false,
      onUpdate: ({ editor: currentEditor }) => {
        onChangeRef.current(currentEditor.getJSON() as RichTextDoc)
      },
      onFocus: ({ editor: currentEditor }) => {
        activeEditorContext?.setActiveEditor(currentEditor)
      },
    },
    []
  )

  React.useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content as JSONContent, { emitUpdate: false })
    }
  }, [content, editor])

  React.useEffect(() => {
    if (!editor || !activeEditorContext?.setActiveEditor) return
    return () => {
      activeEditorContext.setActiveEditor((current: Editor | null) =>
        current === editor ? null : current
      )
    }
  }, [activeEditorContext, editor])

  return (
    <EditorContent
      editor={editor}
      className={[
        "outline-none [&_.tiptap]:outline-none [&_.tiptap_p]:my-2",
        "[&_.tiptap_ol]:my-2 [&_.tiptap_p]:leading-7 [&_.tiptap_ul]:my-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  )
}
