import * as React from "react"
import { DocumentDragHandle } from "./editor-chrome/drag-handle"
import { DocumentEditorCanvas } from "../runtime/editor"
import { EditorBubbleMenu, EditorTableMenu } from "./editor-chrome/menus"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "../commands/types"
import type { DocumentDefinition, DocumentTemplate } from "../core/types"

import { createDocumentCommands } from "../core/definition"
import { createBaseEditorCommands } from "../commands/base"
import { useDocumentEditorHost, ActiveEditorContext } from "../runtime/react"
import {
  defaultDocumentTemplate,
  getDocumentTemplateStyle,
} from "@workspace/document/presentation"

const protectedNodeTypes = ["documentHeader", "lineItems"]

type DocumentEditorProps = {
  editor: Editor | null
  definition: DocumentDefinition
  onContentChange?: (content: JSONContent) => void
  bubbleCommands?: Array<EditorCommand>
  template?: DocumentTemplate
  onUndo?: () => void
  onRedo?: () => void
}

export function DocumentEditor({
  bubbleCommands,
  definition,
  editor,
  onContentChange,
  onRedo,
  onUndo,
  template = defaultDocumentTemplate,
}: DocumentEditorProps) {
  const { confirm, requestTextInput } = useDocumentEditorHost()
  const [activeEditor, setActiveEditor] = React.useState<Editor | null>(null)
  const activeEditorContext = React.useMemo(
    () => ({ activeEditor, setActiveEditor }),
    [activeEditor]
  )

  React.useEffect(() => {
    if (!editor) return
    const resetActiveEditor = () => setActiveEditor(null)
    editor.on("focus", resetActiveEditor)
    return () => {
      editor.off("focus", resetActiveEditor)
    }
  }, [editor])

  const editorCommands = React.useMemo(
    () => createBaseEditorCommands(requestTextInput),
    [requestTextInput]
  )
  const bubbleMenuCommands = React.useMemo(
    () => editorCommands.filter((command) => command.showInBubbleMenu),
    [editorCommands]
  )
  const templateStyle = React.useMemo(
    () => getDocumentTemplateStyle(template),
    [template]
  )
  const blockCommands = React.useMemo(
    () =>
      [...editorCommands, ...createDocumentCommands(definition)].filter(
        (command) => command.showInFloatingMenu
      ),
    [definition]
  )
  const accessories = editor ? (
    <>
      <EditorBubbleMenu
        editor={activeEditor ?? editor}
        commands={bubbleCommands ?? bubbleMenuCommands}
      />
      <EditorTableMenu editor={editor} confirm={confirm} />
      <DocumentDragHandle
        commands={blockCommands}
        editor={editor}
        protectedNodeTypes={protectedNodeTypes}
      />
    </>
  ) : null

  return (
    <ActiveEditorContext.Provider value={activeEditorContext}>
      <DocumentEditorCanvas
        className="min-h-full min-w-0 overflow-x-hidden px-0 py-4 sm:px-10 lg:px-14"
        contentClassName="relative mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden pb-32 md:pb-10"
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
    </ActiveEditorContext.Provider>
  )
}
