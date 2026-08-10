import { expect, test } from "bun:test"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import { createProposalDraft } from "@workspace/document/proposal"
import { createInvoiceDraftStore, createProposalDraftStore } from "./store"

test("structured changes increment revision and support undo", () => {
  const store = createProposalDraftStore(
    createProposalDraft({ id: "proposal-1" })
  )
  store.commands.setTitle("First")
  expect(store.getSnapshot().data.title).toBe("First")
  expect(store.getSnapshot().revision).toBe(1)
  store.commands.undo()
  expect(store.getSnapshot().data.title).toBe("")
  store.commands.redo()
  expect(store.getSnapshot().data.title).toBe("First")
})

test("removing a pricing block does not remove canonical pricing", () => {
  const store = createProposalDraftStore(
    createProposalDraft({ id: "proposal-1" })
  )
  store.commands.setComposition(
    store
      .getSnapshot()
      .composition.blocks.filter((block) => block.type !== "pricing")
  )
  expect(store.getSnapshot().data.pricing).toBeDefined()
})

test("structured commands flush pending composition before committing", () => {
  const store = createProposalDraftStore(
    createProposalDraft({ id: "proposal-1" })
  )
  let flushed = false
  store.setBeforeStructuredChange(() => {
    flushed = true
    store.commands.setComposition(store.getSnapshot().composition.blocks)
  })
  store.commands.setTitle("After prose")
  expect(flushed).toBe(true)
  expect(store.getSnapshot().data.title).toBe("After prose")
})

test("invoice store supports invoice-specific fields and operations", () => {
  const store = createInvoiceDraftStore(
    createInvoiceDraftFromBlueprint({
      id: "invoice-1",
      blueprint: "standard",
      sellerName: "Acme",
    })
  )

  store.commands.setTitle("Acme Invoice")
  store.commands.setInvoiceNumber("INV-2026-001")
  store.commands.setDueDate("2026-08-30")
  store.commands.setPaymentTerms("Net 30")

  const snapshot = store.getSnapshot()
  expect(snapshot.data.title).toBe("Acme Invoice")
  expect(snapshot.data.invoiceNumber).toBe("INV-2026-001")
  expect(snapshot.data.dueDate).toBe("2026-08-30")
  expect(snapshot.data.paymentTerms).toBe("Net 30")
  expect(snapshot.revision).toBe(4)

  store.commands.undo()
  expect(store.getSnapshot().data.paymentTerms).toBe(
    "Net 14 Days. Please remit payment via bank transfer."
  )
  expect(store.getSnapshot().data.dueDate).toBe("2026-08-30")
})

test("setTitle strips HTML paragraph tags from title", () => {
  const store = createProposalDraftStore(
    createProposalDraft({ id: "proposal-1" })
  )
  store.commands.setTitle("<p>Web Redesign Proposal</p>")
  expect(store.getSnapshot().data.title).toBe("Web Redesign Proposal")
})
