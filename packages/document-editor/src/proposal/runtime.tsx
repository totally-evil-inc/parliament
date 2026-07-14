import type { JSONContent } from "@tiptap/core"
import * as React from "react"
import { compositionToTiptap, tiptapToComposition } from "../core/composition"
import type { DocumentDefinition } from "../core/types"
import type { ProposalDraftStore } from "../runtime/store"
import { useDocumentEditor } from "../runtime/use-document-editor"
import { proposalEditorRegistry } from "./registry"

export function useProposalEditorRuntime({
  debounceMs = 300,
  definition = proposalEditorRegistry,
  store,
}: {
  debounceMs?: number
  definition?: DocumentDefinition
  store: ProposalDraftStore
}) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null)
  const dirtyRef = React.useRef(false)
  const initialContent = React.useMemo(
    () => compositionToTiptap(store.getSnapshot().composition.blocks),
    [store]
  )
  const editor = useDocumentEditor({
    documentId: store.getSnapshot().id,
    content: initialContent,
    definition,
  })

  const flush = React.useCallback(() => {
    if (!editor || !dirtyRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    dirtyRef.current = false
    store.commands.setComposition(tiptapToComposition(editor.getJSON()))
  }, [editor, store])

  const replaceComposition = React.useCallback(() => {
    if (!editor) return
    dirtyRef.current = false
    editor.commands.setContent(
      compositionToTiptap(store.getSnapshot().composition.blocks),
      { emitUpdate: false }
    )
  }, [editor, store])

  const onContentChange = React.useCallback(
    (content: JSONContent) => {
      dirtyRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        dirtyRef.current = false
        store.commands.setComposition(tiptapToComposition(content))
      }, debounceMs)
    },
    [debounceMs, store]
  )

  const undo = React.useCallback(() => {
    flush()
    store.commands.undo()
    replaceComposition()
  }, [flush, replaceComposition, store])

  const redo = React.useCallback(() => {
    store.commands.redo()
    replaceComposition()
  }, [replaceComposition, store])

  React.useEffect(() => {
    store.setBeforeStructuredChange(flush)
    return () => store.setBeforeStructuredChange(null)
  }, [flush, store])

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return React.useMemo(
    () => ({
      editor,
      flush,
      onContentChange,
      redo,
      replaceComposition,
      undo,
    }),
    [editor, flush, onContentChange, redo, replaceComposition, undo]
  )
}

export type ProposalEditorRuntime = ReturnType<typeof useProposalEditorRuntime>
