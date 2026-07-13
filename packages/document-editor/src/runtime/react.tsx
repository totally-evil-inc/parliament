import * as React from "react"
import type { ProposalDraft } from "@workspace/document/schema"
import type { ProposalDraftCommands, ProposalDraftStore } from "./store"

const StoreContext = React.createContext<ProposalDraftStore | null>(null)

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

export function ProposalDraftProvider({
  children,
  store,
}: {
  children: React.ReactNode
  store: ProposalDraftStore
}) {
  return <StoreContext value={store}>{children}</StoreContext>
}

export function useProposalDraftStore() {
  const store = React.use(StoreContext)
  if (!store)
    throw new Error(
      "useProposalDraftStore must be used within ProposalDraftProvider"
    )
  return store
}

export type DocumentEditorChromeContextType = {
  rootEditor: import("@tiptap/react").Editor | null
}

export const DocumentEditorChromeContext =
  React.createContext<DocumentEditorChromeContextType | null>(null)

export function useDocumentEditorChrome() {
  return React.use(DocumentEditorChromeContext)
}

export function useProposalDraft(): ProposalDraft {
  const store = useProposalDraftStore()
  return React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )
}

export function useProposalDraftSelector<T>(
  selector: (document: ProposalDraft) => T
): T {
  return selector(useProposalDraft())
}

export function useProposalDraftCommands(): ProposalDraftCommands {
  return useProposalDraftStore().commands
}
