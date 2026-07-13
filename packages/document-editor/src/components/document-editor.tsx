import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import {
  defaultDocumentTemplate,
  getDocumentTemplateStyle,
} from "@workspace/document/presentation"
import * as React from "react"
import { createBaseEditorCommands } from "../commands/base"
import type { EditorCommand } from "../commands/types"
import { editorCommandsForSurface } from "../commands/types"
import { createDocumentCommands } from "../core/definition"
import type { DocumentDefinition, DocumentTemplate } from "../core/types"
import { DocumentEditorCanvas } from "../runtime/editor"
import {
  DocumentEditorChromeContext,
  useDocumentEditorHost,
} from "../runtime/react"
import { DocumentDragHandle } from "./editor-chrome/drag-handle"
import { EditorBubbleMenu, EditorTableMenu } from "./editor-chrome/menus"

const protectedNodeTypes = ["documentHeader", "lineItems"]

function canUseBubbleEditor(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return false
  try {
    return Boolean(editor.view)
  } catch {
    return false
  }
}

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
  const chromeContext = React.useMemo(
    () => ({
      rootEditor: editor,
    }),
    [editor]
  )

  const editorCommands = React.useMemo(
    () => createBaseEditorCommands(requestTextInput),
    [requestTextInput]
  )
  const bubbleMenuCommands = React.useMemo(
    () => editorCommandsForSurface(editorCommands, "bubble"),
    [editorCommands]
  )
  const templateStyle = React.useMemo(
    () => getDocumentTemplateStyle(template),
    [template]
  )
  const blockCommands = React.useMemo(
    () =>
      editorCommandsForSurface(
        [...editorCommands, ...createDocumentCommands(definition)],
        "floating"
      ),
    [definition, editorCommands]
  )
  const activeBubbleCommands = bubbleCommands ?? bubbleMenuCommands
  const canRenderBubbleMenu = canUseBubbleEditor(editor)
  const accessories = editor ? (
    <>
      {canRenderBubbleMenu ? (
        <EditorBubbleMenu
          editor={editor}
          pluginKey="root-bubble-menu"
          commands={activeBubbleCommands}
        />
      ) : null}
      <EditorTableMenu editor={editor} confirm={confirm} />
      <DocumentDragHandle
        commands={blockCommands}
        editor={editor}
        protectedNodeTypes={protectedNodeTypes}
      />
    </>
  ) : null

  return (
    <DocumentEditorChromeContext.Provider value={chromeContext}>
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
    </DocumentEditorChromeContext.Provider>
  )
}
