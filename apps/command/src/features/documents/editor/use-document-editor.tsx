import * as React from "react"
import { useDocumentEditorAdapter } from "@workspace/document-editor"
import { createDocumentCommands } from "./definition"
import {
  businessDocumentPreset,
  createBaseRichTextPreset,
  documentEditorClassName,
} from "./presets"
import type { DocumentEditorConfig } from "./types"
import type { Editor } from "@tiptap/react"

import { editorCommands } from "@/lib/editor/commands"

export function useDocumentEditor({
  documentId,
  content,
  definition,
}: DocumentEditorConfig) {
  const editorRef = React.useRef<Editor | null>(null)
  const commands = React.useMemo(
    () => [...editorCommands, ...createDocumentCommands(definition)],
    [definition]
  )

  const customExtensions = React.useMemo(
    () => [
      ...(definition.presets?.includes("business")
        ? businessDocumentPreset
        : []),
      ...(definition.schemaExtensions ?? []),
      ...definition.blocks.flatMap((block) =>
        "extension" in block && block.extension ? [block.extension] : []
      ),
    ],
    [definition]
  )

  const editor = useDocumentEditorAdapter({
    extensions: [
      ...createBaseRichTextPreset({
        getEditor: () => editorRef.current,
        placeholder: definition.placeholder,
        commands,
      }),
      ...customExtensions,
    ],
    content,
    className: documentEditorClassName,
    documentKey: `${definition.type}:${documentId ?? "new"}`,
  })
  editorRef.current = editor
  return editor
}
