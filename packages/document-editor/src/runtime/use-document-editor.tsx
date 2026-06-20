import * as React from "react"
import { useDocumentEditorAdapter } from "./editor"
import { createDocumentCommands } from "../core/definition"
import {
  businessDocumentPreset,
  createBaseRichTextPreset,
  documentEditorClassName,
} from "../extensions/presets"
import type { DocumentEditorConfig } from "../core/types"
import type { Editor } from "@tiptap/react"

import { createBaseEditorCommands } from "../commands/base"
import { useDocumentEditorHost } from "./react"

export function useDocumentEditor({
  documentId,
  content,
  definition,
}: DocumentEditorConfig) {
  const { requestTextInput } = useDocumentEditorHost()
  const editorRef = React.useRef<Editor | null>(null)
  const commands = React.useMemo(
    () => [
      ...createBaseEditorCommands(requestTextInput),
      ...createDocumentCommands(definition),
    ],
    [definition, requestTextInput]
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
        requestTextInput,
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
