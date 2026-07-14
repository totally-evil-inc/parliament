import { expect, test } from "bun:test"
import { finalizeProposalDraft } from "./finalize"
import { createProposalDraft } from "./proposal"

test("finalizeProposalDraft rejects invalid input", () => {
  expect(() => finalizeProposalDraft({ id: "not-a-proposal" })).toThrow()
})

test("finalizeProposalDraft produces stable hashes for identical drafts", () => {
  const draft = createProposalDraft({
    id: "proposal-1",
    now: new Date("2026-06-20T10:00:00.000Z"),
  })

  expect(finalizeProposalDraft(draft).contentHash).toBe(
    finalizeProposalDraft(JSON.parse(JSON.stringify(draft))).contentHash
  )
})

test("finalizeProposalDraft includes pricing calculation version", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  const snapshot = finalizeProposalDraft(draft)

  expect(snapshot.templateId).toBe(draft.template.id)
  expect(snapshot.templateVersion).toBe(draft.template.version)
  expect(snapshot.calculationVersion).toBe("proposal-pricing@1")
})
