import * as React from "react"
import { EditorContent } from "@tiptap/react"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

import { EditorFloatingMenu } from "@/features/workspace/editor/floating-menu"
import { EditorBubbleMenu } from "@/features/workspace/editor/bubble-menu"
import { EditorTableMenu } from "@/features/workspace/editor/table-menu"

interface ProposalEditorProps {
  editor: Editor | null
  onContentChange?: (content: JSONContent) => void
}

export default function ProposalEditor({
  editor,
  onContentChange,
}: ProposalEditorProps) {
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
            <EditorBubbleMenu editor={editor} />
            <EditorFloatingMenu editor={editor} />
            <EditorTableMenu editor={editor} />
          </>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
