import * as React from "react"
import { Node } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import type { RichTextDoc } from "@workspace/document/schema"
import { useDocumentEditorChrome } from "../../runtime/react"

const EmbeddedDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block*",
})

function editorContent(content: RichTextDoc, inline: boolean): JSONContent {
  if (!inline) return content as JSONContent
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content.content as Array<JSONContent>,
      },
    ],
  }
}

function canonicalContent(
  editorContent: JSONContent,
  inline: boolean
): RichTextDoc {
  if (!inline) return editorContent as RichTextDoc
  const paragraph = editorContent.content?.find(
    (node) => node.type === "paragraph"
  )
  return {
    type: "doc",
    content: (paragraph?.content ?? []) as RichTextDoc["content"],
  }
}

export function RichTextDocEditor({
  className,
  content,
  inline = false,
  onChange,
}: {
  className?: string
  content: RichTextDoc
  inline?: boolean
  onChange: (content: RichTextDoc) => void
}) {
  const chrome = useDocumentEditorChrome()
  const onChangeRef = React.useRef(onChange)
  const chromeRef = React.useRef(chrome)
  onChangeRef.current = onChange
  chromeRef.current = chrome

  const editor = useEditor(
    {
      extensions: [
        EmbeddedDocument.extend({
          content: inline ? "paragraph" : "block*",
        }),
        StarterKit.configure({
          document: false,
          heading: { levels: [2, 3] },
        }),
      ],
      content: editorContent(content, inline),
      immediatelyRender: false,
      ...(inline
        ? {
            editorProps: {
              handleKeyDown: (_view, event) => {
                if (event.key !== "Enter") return false
                event.preventDefault()
                return true
              },
            },
          }
        : {}),
      onUpdate: ({ editor: currentEditor }) => {
        onChangeRef.current(canonicalContent(currentEditor.getJSON(), inline))
      },
      onFocus: ({ editor: currentEditor }) => {
        chromeRef.current?.activateTextEditor(currentEditor, {
          mode: inline ? "inline" : "rich",
        })
      },
      onBlur: ({ editor: currentEditor }) => {
        window.setTimeout(() => {
          if (currentEditor.isFocused || currentEditor.isDestroyed) return
          chromeRef.current?.clearTextEditor(currentEditor)
        }, 150)
      },
    },
    []
  )

  React.useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return
    const nextContent = editorContent(content, inline)
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      editor.commands.setContent(nextContent, { emitUpdate: false })
    }
  }, [content, editor, inline])

  React.useEffect(() => {
    if (!editor || !chrome) return
    return () => {
      chrome.clearTextEditor(editor)
    }
  }, [chrome, editor])

  return (
    <EditorContent
      editor={editor}
      className={[
        "outline-none [&_.tiptap]:outline-none",
        inline
          ? "[&_.tiptap]:min-h-[1em] [&_.tiptap_p]:my-0 [&_.tiptap_p]:leading-[inherit]"
          : "[&_.tiptap_ol]:my-2 [&_.tiptap_p]:my-2 [&_.tiptap_p]:leading-7 [&_.tiptap_ul]:my-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  )
}
