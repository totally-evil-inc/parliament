import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { createProposalDraft } from "@workspace/document/proposal"
import {
  compositionToTiptap,
  tiptapToComposition,
} from "@workspace/document-editor/composition"
import { ProposalDraftProvider } from "@workspace/document-editor/react"
import { createProposalDraftStore } from "@workspace/document-editor/store"
import type { DocumentTemplate } from "@/features/documents/editor/types"

import { DocumentBlockSidebar } from "@/features/documents/editor/document-block-sidebar"
import { DocumentEditor } from "@/features/documents/editor/document-editor"
import { getDefaultDocumentTemplateForScheme } from "@/features/documents/editor/templates"
import { DocumentToolbar } from "@/features/documents/editor/document-toolbar"
import { useDocumentEditor } from "@/features/documents/editor/use-document-editor"
import { proposalDocumentDefinition } from "@/features/proposals/document-definition"
import { useTheme } from "@/components/theme-provider"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const store = React.useMemo(
    () =>
      createProposalDraftStore(createProposalDraft({ id: "proposal-draft" })),
    []
  )

  return (
    <ProposalDraftProvider store={store}>
      <ProposalEditorScreen store={store} />
    </ProposalDraftProvider>
  )
}

function ProposalEditorScreen({
  store,
}: {
  store: ReturnType<typeof createProposalDraftStore>
}) {
  const { resolved } = useTheme()
  const session = authClient.useSession()
  const resolvedDefaultTemplate = React.useMemo(
    () => getDefaultDocumentTemplateForScheme(resolved),
    [resolved]
  )
  const [customTemplate, setCustomTemplate] =
    React.useState<DocumentTemplate | null>(null)
  const template = customTemplate ?? resolvedDefaultTemplate
  const compositionTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null)
  const initialContent = React.useMemo(
    () => compositionToTiptap(store.getSnapshot().composition.blocks),
    [store]
  )

  const editor = useDocumentEditor({
    documentId: store.getSnapshot().id,
    content: initialContent,
    definition: proposalDocumentDefinition,
  })

  React.useEffect(() => {
    const name = session.data?.user.name
    if (!name || store.getSnapshot().data.seller.name) return
    store.commands.updateParty("seller", { name })
    store.commands.updatePricing((pricing) => ({
      ...pricing,
      signerName: pricing.signerName || name,
    }))
  }, [session.data?.user.name, store])

  React.useEffect(() => {
    store.commands.setTemplate({
      id: template.id,
      version: 1,
      overrides: template.tokens,
    })
  }, [store, template])

  React.useEffect(
    () => () => {
      if (compositionTimerRef.current) clearTimeout(compositionTimerRef.current)
    },
    []
  )

  const handleContentChange = React.useCallback(
    (content: Parameters<typeof tiptapToComposition>[0]) => {
      if (compositionTimerRef.current) clearTimeout(compositionTimerRef.current)
      compositionTimerRef.current = setTimeout(() => {
        store.commands.setComposition(tiptapToComposition(content))
      }, 300)
    },
    [store]
  )

  const syncEditorFromStore = React.useCallback(() => {
    if (!editor) return
    editor.commands.setContent(
      compositionToTiptap(store.getSnapshot().composition.blocks),
      { emitUpdate: false }
    )
  }, [editor, store])

  const commitPendingComposition = React.useCallback(() => {
    if (!editor || !compositionTimerRef.current) return
    clearTimeout(compositionTimerRef.current)
    compositionTimerRef.current = null
    store.commands.setComposition(tiptapToComposition(editor.getJSON()))
  }, [editor, store])

  React.useEffect(() => {
    store.setBeforeStructuredChange(commitPendingComposition)
    return () => store.setBeforeStructuredChange(null)
  }, [commitPendingComposition, store])

  const handleUndo = React.useCallback(() => {
    commitPendingComposition()
    store.commands.undo()
    syncEditorFromStore()
  }, [commitPendingComposition, store, syncEditorFromStore])

  const handleRedo = React.useCallback(() => {
    store.commands.redo()
    syncEditorFromStore()
  }, [store, syncEditorFromStore])

  const definition = React.useMemo(
    () => ({
      ...proposalDocumentDefinition,
      toolbarActions: proposalDocumentDefinition.toolbarActions.map((action) =>
        action.id === "export"
          ? {
              ...action,
              command: () => {
                if (!editor) return
                store.commands.setComposition(
                  tiptapToComposition(editor.getJSON())
                )
                const draft = store.getSnapshot()
                const key = `proposal-draft:${draft.id}:${draft.revision}`
                window.sessionStorage.setItem(key, JSON.stringify(draft))
                window.open(
                  `/documents/print?draftKey=${encodeURIComponent(key)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              },
            }
          : action
      ),
    }),
    [editor, store]
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <SidebarProvider
        defaultOpen={true}
        className="h-full min-h-0 overflow-hidden"
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <div
          className="relative flex min-h-0 flex-1 overflow-hidden"
          style={{ backgroundColor: template.tokens.canvasBackground }}
          data-document-template={template.id}
        >
          <ScrollArea className="relative min-h-0 flex-1">
            <DocumentEditor
              editor={editor}
              onContentChange={handleContentChange}
              template={template}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
            <DocumentToolbar editor={editor} definition={definition} />
          </ScrollArea>
          <DocumentBlockSidebar
            editor={editor}
            definition={proposalDocumentDefinition}
            defaultTemplate={resolvedDefaultTemplate}
            template={template}
            onTemplateChange={(nextTemplate) => {
              setCustomTemplate(nextTemplate)
            }}
            onTemplateReset={() => {
              setCustomTemplate(null)
            }}
          />
        </div>
      </SidebarProvider>
    </div>
  )
}
