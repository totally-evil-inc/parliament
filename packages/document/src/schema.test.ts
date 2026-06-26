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

test("legacy string section and FAQ fields parse as inline rich text", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  const parsed = parseProposalDraft({
    ...draft,
    composition: {
      version: 1,
      blocks: [
        {
          id: "section-1",
          type: "section",
          version: 1,
          eyebrow: "Overview",
          title: "Project direction",
          lead: "A concise recommendation.",
          variant: "default",
          content: { type: "doc", content: [] },
        },
        {
          id: "faq-1",
          type: "faq",
          version: 1,
          variant: "list",
          items: [
            {
              id: "faq-item-1",
              question: "Can the scope change?",
              answer: { type: "doc", content: [] },
            },
          ],
        },
      ],
    },
  })

  const [section, faq] = parsed.composition.blocks
  expect(section).toMatchObject({
    type: "section",
    title: { content: [{ type: "text", text: "Project direction" }] },
  })
  expect(faq).toMatchObject({
    type: "faq",
    items: [
      {
        question: {
          content: [{ type: "text", text: "Can the scope change?" }],
        },
      },
    ],
  })
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
