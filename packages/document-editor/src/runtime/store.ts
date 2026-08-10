import type {
  DocumentBlock,
  InvoiceDraft,
  PartySnapshot,
  ProposalDraft,
} from "@workspace/document/schema"
import {
  parseInvoiceDraft,
  parseProposalDraft,
} from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"

type Listener = () => void

export type BaseDraftStore<D> = {
  getSnapshot(): D
  subscribe(listener: Listener): () => void
  setBeforeStructuredChange(listener: (() => void) | null): void
  getBeforeStructuredChange(): (() => void) | null
  commit(
    update: (current: D) => D,
    options?: { coalesceKey?: string; recordHistory?: boolean }
  ): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  replace(nextDocument: D): void
}

export function createBaseDraftStore<
  D extends { revision: number; updatedAt: string; id: string },
>(initialDocument: D, parse: (input: unknown) => D): BaseDraftStore<D> {
  let document = parse(initialDocument)
  let undoStack: Array<{
    before: D
    after: D
    coalesceKey?: string
    committedAt: number
  }> = []
  let redoStack: Array<{
    before: D
    after: D
    coalesceKey?: string
    committedAt: number
  }> = []
  let beforeStructuredChange: (() => void) | null = null
  const listeners = new Set<Listener>()

  const emit = () => {
    listeners.forEach((listener) => {
      listener()
    })
  }

  const commit = (
    update: (current: D) => D,
    options: { coalesceKey?: string; recordHistory?: boolean } = {}
  ) => {
    const before = document
    const candidate = update(before)
    if (candidate === before) return
    const now = Date.now()
    const after = parse({
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

  return {
    getSnapshot: () => document,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setBeforeStructuredChange(listener) {
      beforeStructuredChange = listener
    },
    getBeforeStructuredChange: () => beforeStructuredChange,
    commit,
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
    replace(nextDocument) {
      document = parse(nextDocument)
      undoStack = []
      redoStack = []
      emit()
    },
  }
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
  const base = createBaseDraftStore(initialDocument, parseProposalDraft)

  const commands: ProposalDraftCommands = {
    setTitle(value) {
      const cleanTitle = stripHtml(value)
      base.getBeforeStructuredChange()?.()
      base.commit(
        (current) => ({
          ...current,
          data: { ...current.data, title: cleanTitle },
        }),
        { coalesceKey: "title" }
      )
    },
    setIssueDate(value) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({
        ...current,
        data: { ...current.data, issueDate: value },
      }))
    },
    setValidUntil(value) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({
        ...current,
        data: { ...current.data, validUntil: value },
      }))
    },
    updateParty(party, patch, coalesceKey) {
      base.getBeforeStructuredChange()?.()
      base.commit(
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
      base.getBeforeStructuredChange()?.()
      base.commit(
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
      base.commit(
        (current) => ({ ...current, composition: { version: 1, blocks } }),
        { coalesceKey: "composition" }
      )
    },
    setTemplate(template) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({ ...current, template }))
    },
    replace(nextDocument) {
      base.replace(nextDocument)
    },
    undo: () => base.undo(),
    redo: () => base.redo(),
    canUndo: () => base.canUndo(),
    canRedo: () => base.canRedo(),
  }

  return {
    getSnapshot: () => base.getSnapshot(),
    subscribe: (listener) => base.subscribe(listener),
    setBeforeStructuredChange: (listener) =>
      base.setBeforeStructuredChange(listener),
    commands,
  }
}

export type InvoiceDraftCommands = {
  setTitle(value: string): void
  setInvoiceNumber(value: string): void
  setIssueDate(value: string): void
  setDueDate(value: string): void
  setPaymentTerms(value: string | undefined): void
  updateParty(
    party: "seller" | "customer",
    patch: Partial<PartySnapshot>,
    coalesceKey?: string
  ): void
  updatePricing(
    update: (
      pricing: NonNullable<InvoiceDraft["data"]["pricing"]>
    ) => NonNullable<InvoiceDraft["data"]["pricing"]>,
    coalesceKey?: string
  ): void
  setComposition(blocks: Array<DocumentBlock>): void
  setTemplate(template: InvoiceDraft["template"]): void
  replace(document: InvoiceDraft): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
}

export type InvoiceDraftStore = {
  getSnapshot(): InvoiceDraft
  subscribe(listener: Listener): () => void
  setBeforeStructuredChange(listener: (() => void) | null): void
  commands: InvoiceDraftCommands
}

export function createInvoiceDraftStore(
  initialDocument: InvoiceDraft
): InvoiceDraftStore {
  const base = createBaseDraftStore(initialDocument, parseInvoiceDraft)

  const commands: InvoiceDraftCommands = {
    setTitle(value) {
      const cleanTitle = stripHtml(value)
      base.getBeforeStructuredChange()?.()
      base.commit(
        (current) => ({
          ...current,
          data: { ...current.data, title: cleanTitle },
        }),
        { coalesceKey: "title" }
      )
    },
    setInvoiceNumber(value) {
      base.getBeforeStructuredChange()?.()
      base.commit(
        (current) => ({
          ...current,
          data: { ...current.data, invoiceNumber: value },
        }),
        { coalesceKey: "invoiceNumber" }
      )
    },
    setIssueDate(value) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({
        ...current,
        data: { ...current.data, issueDate: value },
      }))
    },
    setDueDate(value) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({
        ...current,
        data: { ...current.data, dueDate: value },
      }))
    },
    setPaymentTerms(value) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({
        ...current,
        data: { ...current.data, paymentTerms: value },
      }))
    },
    updateParty(party, patch, coalesceKey) {
      base.getBeforeStructuredChange()?.()
      base.commit(
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
      base.getBeforeStructuredChange()?.()
      base.commit(
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
      base.commit(
        (current) => ({ ...current, composition: { version: 1, blocks } }),
        { coalesceKey: "composition" }
      )
    },
    setTemplate(template) {
      base.getBeforeStructuredChange()?.()
      base.commit((current) => ({ ...current, template }))
    },
    replace(nextDocument) {
      base.replace(nextDocument)
    },
    undo: () => base.undo(),
    redo: () => base.redo(),
    canUndo: () => base.canUndo(),
    canRedo: () => base.canRedo(),
  }

  return {
    getSnapshot: () => base.getSnapshot(),
    subscribe: (listener) => base.subscribe(listener),
    setBeforeStructuredChange: (listener) =>
      base.setBeforeStructuredChange(listener),
    commands,
  }
}
