import * as React from "react"
import { useEditor } from "@tiptap/react"
import { createDocumentCommands } from "./definition"
import {
  businessDocumentPreset,
  createBaseRichTextPreset,
  documentEditorClassName,
} from "./presets"
import type { JSONContent } from "@tiptap/core"
import type { DocumentEditorConfig } from "./types"

import { editorCommands } from "@/lib/editor/commands"

function serializeContent(content: JSONContent) {
  return JSON.stringify(content)
}

export function useDocumentEditor({
  documentId,
  content,
  definition,
}: DocumentEditorConfig) {
  const editorRef = React.useRef<ReturnType<typeof useEditor>>(null)
  const commands = React.useMemo(
    () => [...editorCommands, ...createDocumentCommands(definition)],
    [definition]
  )

  const customExtensions = React.useMemo(
    () => [
      ...(definition.presets?.includes("business") ? businessDocumentPreset : []),
      ...(definition.schemaExtensions ?? []),
      ...definition.blocks.flatMap((block) =>
        "extension" in block && block.extension ? [block.extension] : []
      ),
    ],
    [definition]
  )

  const editor = useEditor(
    {
      extensions: [
        ...createBaseRichTextPreset({
          getEditor: () => editorRef.current,
          placeholder: definition.placeholder,
          commands,
        }),
        ...customExtensions,
      ],
      content,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: documentEditorClassName,
        },
      },
    },
    [definition.type, documentId]
  )

  editorRef.current = editor

  React.useEffect(() => {
    if (!editor) return

    if (serializeContent(editor.getJSON()) === serializeContent(content)) {
      return
    }

    editor.commands.setContent(content, { emitUpdate: false })
  }, [content, editor])

  return editor
}
