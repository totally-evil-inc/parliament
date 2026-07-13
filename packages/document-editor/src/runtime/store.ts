import type {
  DocumentBlock,
  PartySnapshot,
  ProposalDraft,
} from "@workspace/document/schema"
import { parseProposalDraft } from "@workspace/document/schema"

type Listener = () => void
type HistoryEntry = {
  before: ProposalDraft
  after: ProposalDraft
  coalesceKey?: string
  committedAt: number
}

export type ProposalDraftCommands = {
  setTitle(value: string): void
  setIssueDate(value: string): void
  setValidUntil(value: string | undefined): void
  updateParty(
    party: "seller" | "customer",
    patch: Partial<PartySnapshot>,
    coalesceKey?: string
  ): void
  updatePricing(
    update: (
      pricing: NonNullable<ProposalDraft["data"]["pricing"]>
    ) => NonNullable<ProposalDraft["data"]["pricing"]>,
    coalesceKey?: string
  ): void
  setComposition(blocks: Array<DocumentBlock>): void
  setTemplate(template: ProposalDraft["template"]): void
  replace(document: ProposalDraft): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
}

export type ProposalDraftStore = {
  getSnapshot(): ProposalDraft
  subscribe(listener: Listener): () => void
  setBeforeStructuredChange(listener: (() => void) | null): void
  commands: ProposalDraftCommands
}

export function createProposalDraftStore(
  initialDocument: ProposalDraft
): ProposalDraftStore {
  let document = parseProposalDraft(initialDocument)
  let undoStack: Array<HistoryEntry> = []
  let redoStack: Array<HistoryEntry> = []
  let beforeStructuredChange: (() => void) | null = null
  const listeners = new Set<Listener>()

  const emit = () =>
    listeners.forEach((listener) => {
      listener()
    })
  const commit = (
    update: (current: ProposalDraft) => ProposalDraft,
    options: { coalesceKey?: string; recordHistory?: boolean } = {}
  ) => {
    const before = document
    const candidate = update(before)
    if (candidate === before) return
    const now = Date.now()
    const after = parseProposalDraft({
      ...candidate,
      revision: before.revision + 1,
      updatedAt: new Date(now).toISOString(),
    })
    document = after

    if (options.recordHistory !== false) {
      const previous = undoStack.at(-1)
      if (
        options.coalesceKey &&
        previous?.coalesceKey === options.coalesceKey &&
        now - previous.committedAt <= 750
      ) {
        undoStack[undoStack.length - 1] = {
          ...previous,
          after,
          committedAt: now,
        }
      } else {
        undoStack.push({
          before,
          after,
          coalesceKey: options.coalesceKey,
          committedAt: now,
        })
      }
      redoStack = []
    }
    emit()
  }

  const commands: ProposalDraftCommands = {
    setTitle(value) {
      beforeStructuredChange?.()
      commit(
        (current) => ({ ...current, data: { ...current.data, title: value } }),
        { coalesceKey: "title" }
      )
    },
    setIssueDate(value) {
      beforeStructuredChange?.()
      commit((current) => ({
        ...current,
        data: { ...current.data, issueDate: value },
      }))
    },
    setValidUntil(value) {
      beforeStructuredChange?.()
      commit((current) => ({
        ...current,
        data: { ...current.data, validUntil: value },
      }))
    },
    updateParty(party, patch, coalesceKey) {
      beforeStructuredChange?.()
      commit(
        (current) => ({
          ...current,
          data: {
            ...current.data,
            [party]: { ...current.data[party], ...patch },
          },
        }),
        { coalesceKey: coalesceKey ? `${party}.${coalesceKey}` : undefined }
      )
    },
    updatePricing(update, coalesceKey) {
      beforeStructuredChange?.()
      commit(
        (current) => {
          const pricing = current.data.pricing
          if (!pricing) return current
          return {
            ...current,
            data: { ...current.data, pricing: update(pricing) },
          }
        },
        { coalesceKey: coalesceKey ? `pricing.${coalesceKey}` : undefined }
      )
    },
    setComposition(blocks) {
      commit(
        (current) => ({ ...current, composition: { version: 1, blocks } }),
        { coalesceKey: "composition" }
      )
    },
    setTemplate(template) {
      beforeStructuredChange?.()
      commit((current) => ({ ...current, template }))
    },
    replace(nextDocument) {
      document = parseProposalDraft(nextDocument)
      undoStack = []
      redoStack = []
      emit()
    },
    undo() {
      const entry = undoStack.pop()
      if (!entry) return
      redoStack.push(entry)
      document = entry.before
      emit()
    },
    redo() {
      const entry = redoStack.pop()
      if (!entry) return
      undoStack.push(entry)
      document = entry.after
      emit()
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  }

  return {
    getSnapshot: () => document,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setBeforeStructuredChange(listener) {
      beforeStructuredChange = listener
    },
    commands,
  }
}
