import type { InvoiceDraft, ProposalDraft } from "@workspace/document/schema"
import * as React from "react"
import type {
  InvoiceDraftCommands,
  InvoiceDraftStore,
  ProposalDraftCommands,
  ProposalDraftStore,
} from "./store"

// biome-ignore lint/suspicious/noExplicitAny: generic store context
const StoreContext = React.createContext<any | null>(null)

export type DocumentEditorHostAdapter = {
  confirm: (options: {
    title: string
    description?: string
    confirmLabel: string
    variant: "destructive"
  }) => Promise<boolean>
  createId: (prefix: string) => string
  requestTextInput: (options: {
    title: string
    initialValue: string
  }) => string | null
  onAction?: (actionId: string) => void | Promise<void>
  selectAsset?: (kind: "logo" | "image") => Promise<string | null>
  searchSources?: (
    query: string
  ) => Promise<Array<{ id: string; label: string }>>
}

const HostContext = React.createContext<DocumentEditorHostAdapter | null>(null)

export function DocumentEditorHostProvider({
  adapter,
  children,
}: {
  adapter: DocumentEditorHostAdapter
  children: React.ReactNode
}) {
  return <HostContext value={adapter}>{children}</HostContext>
}

export function useDocumentEditorHost() {
  const adapter = React.use(HostContext)
  if (!adapter)
    throw new Error(
      "useDocumentEditorHost must be used within DocumentEditorHostProvider"
    )
  return adapter
}

export function useOptionalDocumentEditorHost(): DocumentEditorHostAdapter | null {
  return React.use(HostContext)
}

// Generalized Document Draft Context & Hooks
export function DocumentDraftProvider({
  children,
  store,
}: {
  children: React.ReactNode
  // biome-ignore lint/suspicious/noExplicitAny: generic store parameter
  store: any
}) {
  return <StoreContext value={store}>{children}</StoreContext>
}

export function useDocumentDraftStore() {
  const store = React.use(StoreContext)
  if (!store)
    throw new Error(
      "useDocumentDraftStore must be used within DocumentDraftProvider"
    )
  return store
}

// biome-ignore lint/suspicious/noExplicitAny: generic document return value
export function useDocumentDraft(): any {
  const store = useDocumentDraftStore()
  return React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
}

// biome-ignore lint/suspicious/noExplicitAny: generic document selector parameter
export function useDocumentDraftSelector<T>(selector: (document: any) => T): T {
  return selector(useDocumentDraft())
}

// biome-ignore lint/suspicious/noExplicitAny: generic commands return value
export function useDocumentDraftCommands(): any {
  return useDocumentDraftStore().commands
}

// Backwards-compatible Proposal hooks/provider
export function ProposalDraftProvider({
  children,
  store,
}: {
  children: React.ReactNode
  store: ProposalDraftStore
}) {
  return <DocumentDraftProvider store={store}>{children}</DocumentDraftProvider>
}

export function useProposalDraftStore(): ProposalDraftStore {
  return useDocumentDraftStore()
}

export function useProposalDraft(): ProposalDraft {
  return useDocumentDraft()
}

export function useProposalDraftSelector<T>(
  selector: (document: ProposalDraft) => T
): T {
  return selector(useProposalDraft())
}

export function useProposalDraftCommands(): ProposalDraftCommands {
  return useProposalDraftStore().commands
}

// Invoice specific hooks/provider
export function InvoiceDraftProvider({
  children,
  store,
}: {
  children: React.ReactNode
  store: InvoiceDraftStore
}) {
  return <DocumentDraftProvider store={store}>{children}</DocumentDraftProvider>
}

export function useInvoiceDraftStore(): InvoiceDraftStore {
  return useDocumentDraftStore()
}

export function useInvoiceDraft(): InvoiceDraft {
  return useDocumentDraft()
}

export function useInvoiceDraftSelector<T>(
  selector: (document: InvoiceDraft) => T
): T {
  return selector(useInvoiceDraft())
}

export function useInvoiceDraftCommands(): InvoiceDraftCommands {
  return useInvoiceDraftStore().commands
}

export type DocumentEditorChromeContextType = {
  rootEditor: import("@tiptap/react").Editor | null
}

export const DocumentEditorChromeContext =
  React.createContext<DocumentEditorChromeContextType | null>(null)

export function useDocumentEditorChrome() {
  return React.use(DocumentEditorChromeContext)
}
