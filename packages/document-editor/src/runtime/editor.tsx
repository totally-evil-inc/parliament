import type { AnyExtension, Editor, JSONContent } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import * as React from "react"

export function useDocumentEditorAdapter({
  className,
  content,
  documentKey,
  extensions,
}: {
  className: string
  content: JSONContent
  documentKey: string
  extensions: Array<AnyExtension>
}) {
  const editor = useEditor(
    {
      extensions,
      content,
      immediatelyRender: false,
      editorProps: { attributes: { class: className } },
    },
    [documentKey]
  )

  React.useEffect(() => {
    if (!editor || editor.isFocused || equalContent(editor.getJSON(), content))
      return
    queueMicrotask(() => {
      if (!editor || editor.isFocused) return
      editor.commands.setContent(content, { emitUpdate: false })
    })
  }, [content, editor])

  return editor
}

export function DocumentEditorCanvas({
  accessories,
  children,
  className,
  contentClassName,
  editor,
  onContentChange,
  onRedo,
  onUndo,
  style,
  templateId,
}: {
  accessories?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
  editor: Editor | null
  onContentChange?: (content: JSONContent) => void
  onRedo?: () => void
  onUndo?: () => void
  style?: React.CSSProperties
  templateId: string
}) {
  const lastContentRef = React.useRef<string | null>(null)
  const onContentChangeRef = React.useRef(onContentChange)

  React.useEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])

  React.useEffect(() => {
    if (!editor) return
    lastContentRef.current = JSON.stringify(editor.getJSON())
    const handleUpdate = () => {
      if (!onContentChangeRef.current) return
      const content = editor.getJSON()
      const serialized = JSON.stringify(content)
      if (serialized === lastContentRef.current) return
      lastContentRef.current = serialized
      onContentChangeRef.current(content)
    }
    editor.on("update", handleUpdate)
    return () => {
      editor.off("update", handleUpdate)
    }
  }, [editor])

  return (
    <div
      className={className}
      style={style}
      data-document-template={templateId}
      onKeyDownCapture={(event) => {
        if (
          !(event.metaKey || event.ctrlKey) ||
          event.key.toLowerCase() !== "z"
        )
          return
        const command = event.shiftKey ? onRedo : onUndo
        if (!command) return
        event.preventDefault()
        event.stopPropagation()
        command()
      }}
    >
      <div className={contentClassName}>
        {accessories}
        <EditorContent editor={editor} />
      </div>
      {children}
    </div>
  )
}

function equalContent(left: JSONContent, right: JSONContent) {
  return JSON.stringify(left) === JSON.stringify(right)
}
