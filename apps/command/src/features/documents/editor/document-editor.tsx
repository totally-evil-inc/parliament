import * as React from "react"
import { EditorContent } from "@tiptap/react"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "@/lib/editor/commands"

import { EditorBubbleMenu } from "@/features/workspace/editor/bubble-menu"
import { EditorFloatingMenu } from "@/features/workspace/editor/floating-menu"
import { EditorTableMenu } from "@/features/workspace/editor/table-menu"

type DocumentEditorProps = {
  editor: Editor | null
  onContentChange?: (content: JSONContent) => void
  bubbleCommands?: Array<EditorCommand>
}

export function DocumentEditor({
  editor,
  onContentChange,
  bubbleCommands,
}: DocumentEditorProps) {
  const lastContentRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!editor || !onContentChange) return

    lastContentRef.current = JSON.stringify(editor.getJSON())

    const handleUpdate = () => {
      const content = editor.getJSON()
      const serializedContent = JSON.stringify(content)

      if (serializedContent === lastContentRef.current) return

      lastContentRef.current = serializedContent
      onContentChange(content)
    }

    editor.on("update", handleUpdate)

    return () => {
      editor.off("update", handleUpdate)
    }
  }, [editor, onContentChange])

  return (
    <div className="p-3">
      <div className="mx-auto max-w-5xl pb-32">
        {editor ? (
          <>
            <EditorBubbleMenu editor={editor} commands={bubbleCommands} />
            <EditorFloatingMenu editor={editor} />
            <EditorTableMenu editor={editor} />
          </>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
