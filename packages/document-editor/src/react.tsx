import * as React from "react"
import type { ProposalDraft } from "@workspace/document/schema"
import type { ProposalDraftCommands, ProposalDraftStore } from "./store"

const StoreContext = React.createContext<ProposalDraftStore | null>(null)

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
