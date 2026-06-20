import { expect, test } from "bun:test"
import { createProposalDraft } from "./proposal"
import { parseProposalDraft, safeParseProposalDraft } from "./schema"

test("the proposal factory produces a valid canonical draft", () => {
  const draft = createProposalDraft({
    id: "proposal-1",
    now: new Date("2026-06-20T10:00:00.000Z"),
  })
  expect(parseProposalDraft(draft)).toEqual(draft)
})

test("unknown blocks and future schema versions are rejected", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  expect(safeParseProposalDraft({ ...draft, schemaVersion: 2 }).success).toBe(
    false
  )
  expect(
    safeParseProposalDraft({
      ...draft,
      composition: {
        version: 1,
        blocks: [{ id: "x", type: "unknown", version: 1 }],
      },
    }).success
  ).toBe(false)
})
