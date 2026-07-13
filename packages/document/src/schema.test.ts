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

test("TipTap-shaped card block content is rejected by the canonical schema", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  expect(
    safeParseProposalDraft({
      ...draft,
      composition: {
        version: 1,
        blocks: [
          {
            id: "metrics-1",
            type: "metrics",
            version: 1,
            columns: 3,
            content: {
              type: "doc",
              content: [
                {
                  type: "keyNumbersItem",
                  attrs: { id: "metric-1" },
                  content: [
                    {
                      type: "keyNumbersValue",
                      content: [{ type: "text", text: "99%" }],
                    },
                  ],
                },
              ],
            },
          },
        ],
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

test("phase 2 proposal blocks parse and extract text", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  const parsed = parseProposalDraft({
    ...draft,
    assets: [
      {
        id: "asset-1",
        kind: "image",
        storageKey: "images/asset-1",
        mimeType: "image/png",
      },
    ],
    composition: {
      version: 1,
      blocks: [
        {
          id: "cover-1",
          type: "cover",
          version: 1,
          eyebrow: "Proposal",
          title: "Growth platform",
          subtitle: "A focused launch plan.",
          media: { assetId: "asset-1", alt: "Website mockup" },
          variant: "split",
        },
        {
          id: "columns-1",
          type: "columns",
          version: 1,
          columns: 2,
          title: "Workstreams",
          items: [
            {
              id: "column-1",
              heading: "Strategy",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Clarify priorities." }],
                  },
                ],
              },
            },
          ],
        },
        {
          id: "image-text-1",
          type: "imageText",
          version: 1,
          image: { assetId: "asset-1", alt: "Journey map" },
          eyebrow: "Proof",
          title: "Evidence-led design",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Show the rationale." }],
              },
            ],
          },
          reverse: true,
        },
        {
          id: "image-cards-1",
          type: "imageCards",
          version: 1,
          columns: 3,
          variant: "vertical",
          items: [
            {
              id: "card-1",
              image: { assetId: "asset-1", alt: "Service card" },
              title: "Launch",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Ship confidently." }],
                  },
                ],
              },
            },
          ],
        },
        {
          id: "signature-1",
          type: "signature",
          version: 1,
          binding: "proposal.pricing.signer",
          title: "Ready to approve",
          terms: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Confirm the scope." }],
              },
            ],
          },
        },
      ],
    },
  })

  const text = extractProposalText(buildProposalRenderModel(parsed))

  expect(text).toContain("Growth platform")
  expect(text).toContain("Website mockup")
  expect(text).toContain("Clarify priorities.")
  expect(text).toContain("Journey map")
  expect(text).toContain("Service card")
  expect(text).toContain("Ready to approve")
})

test("phase 2 asset references must be canonical asset ids", () => {
  const draft = createProposalDraft({ id: "proposal-1" })

  expect(
    safeParseProposalDraft({
      ...draft,
      composition: {
        version: 1,
        blocks: [
          {
            id: "cover-1",
            type: "cover",
            version: 1,
            title: "Growth platform",
            media: { url: "https://example.test/image.png", alt: "Image" },
          },
        ],
      },
    }).success
  ).toBe(false)
})
