import { expect, test } from "bun:test"
import { buildProposalRenderModel } from "./render"
import { extractProposalText } from "./text"
import {
  createProposalDraft,
  createProposalDraftFromBlueprint,
} from "./proposal"
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

test("the web-design blueprint produces a complete valid proposal", () => {
  const draft = createProposalDraftFromBlueprint({
    id: "proposal-1",
    blueprint: "web-design",
    now: new Date("2026-06-20T10:00:00.000Z"),
    sellerName: "Studio Co.",
  })

  expect(parseProposalDraft(draft)).toEqual(draft)
  expect(draft.template.id).toBe("proposal-web-studio")
  expect(draft.data.validUntil).toBe("2026-07-04")
  expect(draft.composition.blocks.map((block) => block.type)).toEqual([
    "partyHeader",
    "section",
    "metrics",
    "section",
    "timeline",
    "section",
    "team",
    "testimonials",
    "pricing",
    "faq",
    "section",
  ])
})

test("the web-design blueprint extracts proposal text", () => {
  const draft = createProposalDraftFromBlueprint({
    id: "proposal-1",
    blueprint: "web-design",
    now: new Date("2026-06-20T10:00:00.000Z"),
  })
  const text = extractProposalText(buildProposalRenderModel(draft))

  expect(text).toContain("A faster path from visitor interest")
  expect(text).toContain("Who provides the final website copy?")
  expect(text).toContain("Discovery, strategy, and content architecture")
  expect(text).toContain("The process gave our team clarity")
})
