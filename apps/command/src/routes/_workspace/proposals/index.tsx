import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { createProposalDraft } from "@workspace/document/proposal"
import {
  DocumentBlockSidebar,
  DocumentEditor,
  DocumentEditorHostProvider,
  DocumentToolbar,
  ProposalDraftProvider,
  proposalEditorRegistry,
  useProposalEditorRuntime,
} from "@workspace/document-editor"
import { createProposalDraftStore } from "@workspace/document-editor/store"
import { getDefaultDocumentTemplateForScheme } from "@workspace/document/presentation"
import type { DocumentTemplate } from "@workspace/document/presentation"
import type { DocumentEditorHostAdapter } from "@workspace/document-editor"

import { useConfirm } from "@/components/confirm-dialog-provider"
import { useTheme } from "@/components/theme-provider"
import { authClient } from "@/lib/auth-client"
import { createId } from "@/lib/create-id"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const confirm = useConfirm()
  const store = React.useMemo(
    () =>
      createProposalDraftStore(createProposalDraft({ id: "proposal-draft" })),
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
  const { resolved } = useTheme()
  const session = authClient.useSession()
  const resolvedDefaultTemplate = React.useMemo(
    () => getDefaultDocumentTemplateForScheme(resolved),
    [resolved]
  )
  const [customTemplate, setCustomTemplate] =
    React.useState<DocumentTemplate | null>(null)
  const template = customTemplate ?? resolvedDefaultTemplate
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
