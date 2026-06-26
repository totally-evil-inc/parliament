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
import {
  editorCommandsForBubbleMode,
  editorCommandsForSurface,
} from "../commands/types"
import {
  DocumentEditorChromeContext,
  useDocumentEditorHost,
} from "../runtime/react"
import {
  defaultDocumentTemplate,
  getDocumentTemplateStyle,
} from "@workspace/document/presentation"

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
  const [activeTextEditor, setActiveTextEditor] = React.useState<Editor | null>(
    null
  )
  const [activeTextEditorMode, setActiveTextEditorMode] = React.useState<
    "rich" | "inline" | null
  >(null)
  const [bubbleEditorKey, setBubbleEditorKey] = React.useState(0)
  const activeTextEditorRef = React.useRef<Editor | null>(null)
  const activeTextEditorModeRef = React.useRef<"rich" | "inline" | null>(null)
  const activateTextEditor = React.useCallback(
    (nextEditor: Editor, options?: { mode?: "rich" | "inline" }) => {
      const nextMode = options?.mode ?? "rich"
      const editorChanged = activeTextEditorRef.current !== nextEditor
      const modeChanged = activeTextEditorModeRef.current !== nextMode
      activeTextEditorRef.current = nextEditor
      activeTextEditorModeRef.current = nextMode
      setActiveTextEditor(nextEditor)
      setActiveTextEditorMode(nextMode)
      if (editorChanged || modeChanged) {
        setBubbleEditorKey((current) => current + 1)
      }
    },
    []
  )
  const clearTextEditor = React.useCallback((targetEditor: Editor) => {
    if (activeTextEditorRef.current !== targetEditor) return
    activeTextEditorRef.current = null
    activeTextEditorModeRef.current = null
    setActiveTextEditorMode(null)
    setBubbleEditorKey((key) => key + 1)
    setActiveTextEditor((current) => {
      return current === targetEditor ? null : current
    })
  }, [])
  const chromeContext = React.useMemo(
    () => ({
      rootEditor: editor,
      activeTextEditor,
      activeTextEditorMode,
      activateTextEditor,
      clearTextEditor,
    }),
    [
      activateTextEditor,
      activeTextEditor,
      activeTextEditorMode,
      clearTextEditor,
      editor,
    ]
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
  const bubbleEditor = activeTextEditor ?? editor
  const activeBubbleCommands = editorCommandsForBubbleMode(
    activeTextEditor
      ? bubbleMenuCommands
      : (bubbleCommands ?? bubbleMenuCommands),
    activeTextEditorMode
  )
  const canRenderBubbleMenu = canUseBubbleEditor(bubbleEditor)
  const accessories = editor ? (
    <>
      {canRenderBubbleMenu && bubbleEditor ? (
        <EditorBubbleMenu
          key={`${activeTextEditor ? "embedded" : "root"}-${bubbleEditorKey}`}
          editor={bubbleEditor}
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
