import { expect, test } from "bun:test"
import { createProposalDraft } from "@workspace/document/proposal"
import { createProposalDraftStore } from "./store"

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
