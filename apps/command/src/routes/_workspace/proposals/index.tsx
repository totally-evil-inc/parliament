import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { createProposalDraftFromBlueprint } from "@workspace/document/proposal"
import {
  DocumentBlockSidebar,
  DocumentEditor,
  DocumentEditorHostProvider,
  DocumentToolbar,
  DocumentSidebarProvider,
  ProposalDraftProvider,
  proposalEditorRegistry,
  useProposalEditorRuntime,
} from "@workspace/document-editor"
import { createProposalDraftStore } from "@workspace/document-editor/store"
import { webStudioProposalTemplate } from "@workspace/document/presentation"
import type { DocumentTemplate } from "@workspace/document/presentation"
import type { DocumentEditorHostAdapter } from "@workspace/document-editor"

import { useConfirm } from "@/components/confirm-dialog-provider"
import { authClient } from "@/lib/auth-client"
import { createId } from "@/lib/create-id"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const confirm = useConfirm()
  const store = React.useMemo(
    () =>
      createProposalDraftStore(
        createProposalDraftFromBlueprint({
          id: "proposal-draft",
          blueprint: "web-design",
        })
      ),
    []
  )
  const host = React.useMemo<DocumentEditorHostAdapter>(
    () => ({
      confirm,
      createId,
      requestTextInput: ({ initialValue, title }) =>
        window.prompt(title, initialValue),
    }),
    [confirm]
  )

  return (
    <DocumentEditorHostProvider adapter={host}>
      <ProposalDraftProvider store={store}>
        <ProposalEditorScreen store={store} />
      </ProposalDraftProvider>
    </DocumentEditorHostProvider>
  )
}

function ProposalEditorScreen({
  store,
}: {
  store: ReturnType<typeof createProposalDraftStore>
}) {
  const session = authClient.useSession()
  const defaultTemplate = webStudioProposalTemplate
  const [customTemplate, setCustomTemplate] =
    React.useState<DocumentTemplate | null>(null)
  const template = customTemplate ?? defaultTemplate
  const runtime = useProposalEditorRuntime({ store })

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

  const handleAction = React.useCallback(
    (actionId: string) => {
      if (actionId !== "export") return
      runtime.flush()
      const draft = store.getSnapshot()
      const key = `proposal-draft:${draft.id}:${draft.revision}`
      window.sessionStorage.setItem(key, JSON.stringify(draft))
      window.open(
        `/documents/print?draftKey=${encodeURIComponent(key)}`,
        "_blank",
        "noopener,noreferrer"
      )
    },
    [runtime, store]
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <DocumentSidebarProvider defaultOpen={true}>
        <div
          className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
          style={
            {
              backgroundColor: template.tokens.canvasBackground,
              "--sidebar-width": "22rem",
            } as React.CSSProperties
          }
          data-document-template={template.id}
        >
          <ScrollArea className="relative min-h-0 min-w-0 flex-1">
            <DocumentEditor
              definition={proposalEditorRegistry}
              editor={runtime.editor}
              onContentChange={runtime.onContentChange}
              template={template}
              onUndo={runtime.undo}
              onRedo={runtime.redo}
            />
            <DocumentToolbar
              editor={runtime.editor}
              definition={proposalEditorRegistry}
              onAction={handleAction}
            />
          </ScrollArea>
          <DocumentBlockSidebar
            editor={runtime.editor}
            definition={proposalEditorRegistry}
            defaultTemplate={defaultTemplate}
            template={template}
            onTemplateChange={(nextTemplate) => {
              setCustomTemplate(nextTemplate)
            }}
            onTemplateReset={() => {
              setCustomTemplate(null)
            }}
          />
        </div>
      </DocumentSidebarProvider>
    </div>
  )
}
