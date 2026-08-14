import { PaperAirplaneIcon } from "@heroicons/react/24/outline"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { DocumentTemplate } from "@workspace/document/presentation"
import {
  getDefaultDocumentTemplateForScheme,
  getDocumentTemplate,
  webStudioProposalTemplate,
} from "@workspace/document/presentation"
import { parseProposalDraft } from "@workspace/document/schema"
import type { DocumentEditorHostAdapter } from "@workspace/document-editor"
import {
  DocumentBlockSidebar,
  DocumentEditor,
  DocumentEditorHostProvider,
  DocumentSidebarProvider,
  DocumentToolbar,
  ProposalDraftProvider,
  proposalEditorRegistry,
  useProposalEditorRuntime,
} from "@workspace/document-editor"
import { createProposalDraftStore } from "@workspace/document-editor/store"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import * as React from "react"
import { proposalDraftQuery } from "@/api/proposals"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { useTheme } from "@/components/theme-provider"
import { SendDocumentDialog } from "@/features/integrations/components/send-document-dialog"
import { createId } from "@/lib/create-id"
import { buildPublicLink } from "@/lib/public-links"
import type {
  FinalizeProposalDraftResult,
  PersistedProposalDraft,
  SaveProposalDraftResult,
} from "@/server/proposals"
import { finalizeProposalDraft, saveProposalDraft } from "@/server/proposals"

export const Route = createFileRoute("/_workspace/proposals/$proposalId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      proposalDraftQuery(params.proposalId)
    )
  },
  component: ProposalEditRoute,
})

function ProposalEditRoute() {
  const { proposalId } = Route.useParams()
  const { data } = useSuspenseQuery(proposalDraftQuery(proposalId))
  const persisted = data as PersistedProposalDraft
  const document = React.useMemo(
    () => parseProposalDraft(persisted.document),
    [persisted.document]
  )
  const confirm = useConfirm()
  const store = React.useMemo(
    () => createProposalDraftStore(document),
    [document]
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
        <ProposalEditorScreen
          initialRevision={persisted.revision}
          initialStatus={persisted.status}
          store={store}
        />
      </ProposalDraftProvider>
    </DocumentEditorHostProvider>
  )
}

function ProposalEditorScreen({
  initialRevision,
  initialStatus,
  store,
}: {
  initialRevision: number
  initialStatus: string
  store: ReturnType<typeof createProposalDraftStore>
}) {
  const queryClient = useQueryClient()
  const runtime = useProposalEditorRuntime({ store })
  const { resolved: appTheme } = useTheme()
  const defaultTemplate =
    appTheme === "dark"
      ? getDefaultDocumentTemplateForScheme("dark")
      : webStudioProposalTemplate
  const [serverRevision, setServerRevision] = React.useState(initialRevision)
  const [status, setStatus] = React.useState(initialStatus)
  const [customTemplate, setCustomTemplate] =
    React.useState<DocumentTemplate | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const template =
    customTemplate ??
    getDocumentTemplate(store.getSnapshot().template, appTheme)

  const saveDraft = useMutation({
    mutationFn: async () => {
      runtime.flush()
      return await saveProposalDraft({
        data: {
          id: store.getSnapshot().id,
          revision: serverRevision,
          document: store.getSnapshot(),
        },
      })
    },
    onSuccess: async (result) => {
      const saveResult = result as SaveProposalDraftResult
      if (saveResult.status === "conflict") {
        store.commands.replace(parseProposalDraft(saveResult.draft.document))
        setServerRevision(saveResult.draft.revision)
        setStatus(saveResult.draft.status)
        setMessage("The server copy changed. The latest version was loaded.")
        return
      }
      store.commands.replace(parseProposalDraft(saveResult.draft.document))
      setServerRevision(saveResult.draft.revision)
      setStatus(saveResult.draft.status)
      setMessage("Saved")
      await queryClient.invalidateQueries({ queryKey: ["proposals"] })
    },
  })

  const sendDraft = useMutation({
    mutationFn: async (recipientEmail?: string) => {
      runtime.flush()
      const saved = await saveProposalDraft({
        data: {
          id: store.getSnapshot().id,
          revision: serverRevision,
          document: store.getSnapshot(),
        },
      })
      const savedResult = saved as SaveProposalDraftResult
      if (savedResult.status === "conflict") {
        return { status: "conflict" as const, draft: savedResult.draft }
      }
      const finalized = await finalizeProposalDraft({
        data: {
          id: savedResult.draft.id,
          revision: savedResult.draft.revision,
          recipientEmail,
        },
      })
      return {
        status: "sent" as const,
        finalized: finalized as FinalizeProposalDraftResult,
      }
    },
    onSuccess: async (result) => {
      if (result.status === "conflict") {
        store.commands.replace(parseProposalDraft(result.draft.document))
        setServerRevision(result.draft.revision)
        setStatus(result.draft.status)
        setMessage("The server copy changed. Review it before sending.")
        return
      }
      store.commands.replace(
        parseProposalDraft(result.finalized.draft.document)
      )
      setServerRevision(result.finalized.draft.revision)
      setStatus(result.finalized.draft.status)
      setShareUrl(buildPublicLink("proposal", result.finalized.token))
      setMessage("Sent")
      await queryClient.invalidateQueries({ queryKey: ["proposals"] })
    },
  })

  const [sendDialogOpen, setSendDialogOpen] = React.useState(false)

  const handleAction = React.useCallback(
    (actionId: string) => {
      if (actionId === "send") {
        setSendDialogOpen(true)
        return
      }
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

  const snapshot = store.getSnapshot()
  const defaultClientEmail = snapshot.data.customer?.email || ""
  const proposalTitle = snapshot.data.title || "Untitled Proposal"

  const handleFinalizeAndGetShareUrl = React.useCallback(
    async (recipientEmail?: string): Promise<string> => {
      const result = await sendDraft.mutateAsync(recipientEmail)
      if (result.status === "sent" && result.finalized) {
        const url = buildPublicLink("proposal", result.finalized.token)
        setShareUrl(url)
        return url
      }
      throw new Error(
        "Unable to create proposal link. Finalize the document before sending it."
      )
    },
    [sendDraft]
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-background px-4">
        <div className="min-w-0 text-muted-foreground text-xs">
          <span className="font-medium text-foreground">{status}</span>
          {message ? <span className="ml-3">{message}</span> : null}
          {shareUrl ? (
            <a
              className="ml-3 text-primary underline underline-offset-4"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              {shareUrl}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveDraft.mutate()}
            disabled={saveDraft.isPending || sendDraft.isPending}
          >
            {saveDraft.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            onClick={() => setSendDialogOpen(true)}
            disabled={saveDraft.isPending || sendDraft.isPending}
            className="gap-1.5"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {sendDraft.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      <SendDocumentDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        documentType="proposal"
        documentTitle={proposalTitle}
        defaultRecipientEmail={defaultClientEmail}
        shareUrl={shareUrl || undefined}
        onFinalizeAndGetShareUrl={handleFinalizeAndGetShareUrl}
      />
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
              store.commands.setTemplate({
                id: nextTemplate.id,
                version: 1,
                overrides: nextTemplate.tokens,
              })
            }}
          />
        </div>
      </DocumentSidebarProvider>
    </div>
  )
}
