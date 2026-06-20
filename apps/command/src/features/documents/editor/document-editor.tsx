import * as React from "react"
import { DocumentEditorCanvas } from "@workspace/document-editor"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "@/lib/editor/commands"
import type { DocumentTemplate } from "@/features/documents/editor/types"

import { DocumentDragHandle } from "@/features/documents/editor/document-drag-handle"
import {
  defaultDocumentTemplate,
  getDocumentTemplateStyle,
} from "@/features/documents/editor/templates"
import { EditorBubbleMenu } from "@/features/workspace/editor/bubble-menu"
import { EditorFloatingMenu } from "@/features/workspace/editor/floating-menu"
import { EditorTableMenu } from "@/features/workspace/editor/table-menu"

type DocumentEditorProps = {
  editor: Editor | null
  onContentChange?: (content: JSONContent) => void
  bubbleCommands?: Array<EditorCommand>
  template?: DocumentTemplate
  onUndo?: () => void
  onRedo?: () => void
}

export function DocumentEditor({
  bubbleCommands,
  editor,
  onContentChange,
  onRedo,
  onUndo,
  template = defaultDocumentTemplate,
}: DocumentEditorProps) {
  const templateStyle = React.useMemo(
    () => getDocumentTemplateStyle(template),
    [template]
  )
  const accessories = editor ? (
    <>
      <EditorBubbleMenu editor={editor} commands={bubbleCommands} />
      <EditorFloatingMenu editor={editor} />
      <EditorTableMenu editor={editor} />
      <DocumentDragHandle editor={editor} />
    </>
  ) : null

  return (
    <DocumentEditorCanvas
      className="min-h-full p-6 sm:p-10 lg:p-14"
      contentClassName="relative mx-auto max-w-5xl pb-32"
      editor={editor}
      onContentChange={onContentChange}
      onRedo={onRedo}
      onUndo={onUndo}
      style={{
        backgroundColor: "var(--document-canvas-background)",
        ...templateStyle,
      }}
      templateId={template.id}
      accessories={accessories}
    />
  )
}
