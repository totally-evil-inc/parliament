import { ClockIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { DocumentTemplate } from "@workspace/document/presentation"
import {
  getDefaultDocumentTemplateForScheme,
  resolveDocumentTemplate,
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
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import { proposalDraftQuery } from "@/api/proposals"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { useTheme } from "@/components/theme-provider"
import { ScheduledEmailModal } from "@/features/integrations/components/scheduled-email-modal"
import { SendDocumentDialog } from "@/features/integrations/components/send-document-dialog"
import { useScheduledDispatch } from "@/features/integrations/hooks/use-scheduled-dispatches"
import { HeaderPortal } from "@/layouts/header-portal"
import { createId } from "@/lib/create-id"
import { buildPublicLink } from "@/lib/public-links"
import type {
  FinalizeProposalDraftResult,
  SaveProposalDraftResult,
} from "@/server/proposals"
import { finalizeProposalDraft, saveProposalDraft } from "@/server/proposals"

export const Route = createFileRoute("/_workspace/proposals/$proposalId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      proposalDraftQuery(params.proposalId)
    )
  },
  component: ProposalEditorRoute,
})

function ProposalEditorRoute() {
  const { proposalId } = Route.useParams()
  const { data: draft } = useSuspenseQuery(proposalDraftQuery(proposalId))
  const [store] = React.useState(() =>
    createProposalDraftStore(parseProposalDraft(draft.document))
  )
  const confirm = useConfirm()
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
          initialRevision={draft.revision}
          initialStatus={draft.status}
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
  const defaultTemplate = getDefaultDocumentTemplateForScheme(
    appTheme === "dark" ? "dark" : "light"
  )
  const [serverRevision, setServerRevision] = React.useState(initialRevision)
  const [status, setStatus] = React.useState(initialStatus)
  const [customTemplate, setCustomTemplate] =
    React.useState<DocumentTemplate | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const template =
    customTemplate ??
    resolveDocumentTemplate(store.getSnapshot().template, appTheme)

  React.useEffect(() => {
    const currentDoc = store.getSnapshot()
    const isGeneric =
      currentDoc.template.id === "proposal-classic" ||
      currentDoc.template.id === "invoice-classic"
    const currentOverrides = currentDoc.template.overrides
    const hasCompleteOverrides =
      currentOverrides &&
      typeof currentOverrides === "object" &&
      Object.keys(currentOverrides).length >= 10

    if (isGeneric || !hasCompleteOverrides) {
      const resolved = resolveDocumentTemplate(currentDoc.template, appTheme)
      store.commands.setTemplate({
        id: resolved.id,
        version: currentDoc.template.version || 1,
        overrides: resolved.tokens,
      })
    }
  }, [appTheme, store])

  const saveDraft = useMutation({
    mutationFn: async () => {
      runtime.flush()
      const currentDoc = store.getSnapshot()
      const resolved = resolveDocumentTemplate(currentDoc.template, appTheme)
      const documentToSave = {
        ...currentDoc,
        template: {
          id: resolved.id,
          version: currentDoc.template.version || 1,
          overrides: resolved.tokens,
        },
      }
      return await saveProposalDraft({
        data: {
          id: currentDoc.id,
          revision: serverRevision,
          document: documentToSave,
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
      const currentDoc = store.getSnapshot()
      const resolved = resolveDocumentTemplate(currentDoc.template, appTheme)
      const documentToSave = {
        ...currentDoc,
        template: {
          id: resolved.id,
          version: currentDoc.template.version || 1,
          overrides: resolved.tokens,
        },
      }
      const saved = await saveProposalDraft({
        data: {
          id: currentDoc.id,
          revision: serverRevision,
          document: documentToSave,
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
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false)

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

  const { data: scheduledDispatch } = useScheduledDispatch(snapshot.id)
  const isScheduled =
    status === "scheduled" ||
    (scheduledDispatch && scheduledDispatch.status === "pending")

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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <HeaderPortal>
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-border/60 border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex min-w-0 items-center gap-2 truncate text-xs">
              <span className="font-medium text-foreground">
                {proposalTitle}
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-medium text-[10px] uppercase",
                  isScheduled
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-border bg-muted/60 text-muted-foreground"
                )}
              >
                {isScheduled ? "scheduled" : status}
              </span>
              {isScheduled && scheduledDispatch ? (
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="flex cursor-pointer items-center gap-1 font-medium text-[11px] text-amber-600 underline underline-offset-4 hover:opacity-80 dark:text-amber-400"
                >
                  <ClockIcon className="size-3" />
                  Scheduled for{" "}
                  {new Date(
                    scheduledDispatch.scheduledFor
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  • View / Edit
                </button>
              ) : null}
              {message ? (
                <span className="ml-3 text-muted-foreground">{message}</span>
              ) : null}
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
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveDraft.mutate()}
              disabled={saveDraft.isPending || sendDraft.isPending}
            >
              {saveDraft.isPending ? "Saving..." : "Save"}
            </Button>
            {isScheduled ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setScheduleModalOpen(true)}
                className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
              >
                <ClockIcon className="h-4 w-4" />
                Manage Schedule
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setSendDialogOpen(true)}
                disabled={saveDraft.isPending || sendDraft.isPending}
                className="gap-1.5"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {sendDraft.isPending ? "Sending..." : "Send"}
              </Button>
            )}
          </div>
        </header>
      </HeaderPortal>

      <SendDocumentDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        documentType="proposal"
        documentId={snapshot.id}
        documentTitle={proposalTitle}
        defaultRecipientEmail={defaultClientEmail}
        shareUrl={shareUrl || undefined}
        onFinalizeAndGetShareUrl={handleFinalizeAndGetShareUrl}
      />

      <ScheduledEmailModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        dispatch={scheduledDispatch ?? null}
        documentTitle={proposalTitle}
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
