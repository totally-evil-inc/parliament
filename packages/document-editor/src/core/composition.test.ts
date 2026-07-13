import { expect, test } from "bun:test"
import { createProposalDraft } from "@workspace/document/proposal"
import { parseProposalDraft } from "@workspace/document/schema"
import { compositionToTiptap, tiptapToComposition } from "./composition"
import { richTextDocToEditorContent } from "./rich-text"

const field = (text: string, marks?: Array<{ type: string }>) => ({
  type: "doc",
  content: text ? [{ type: "text", text, ...(marks ? { marks } : {}) }] : [],
})

const paragraph = (text: string) => ({
  type: "doc",
  content: text
    ? [{ type: "paragraph", content: [{ type: "text", text }] }]
    : [],
})

const inlineNode = (type: string, value: ReturnType<typeof field>) => ({
  type,
  content: value.content,
})

const blockNode = (
  type: string,
  value: ReturnType<typeof field> | ReturnType<typeof paragraph>
) => ({
  type,
  content: value.content.length ? value.content : [{ type: "paragraph" }],
})

test("bound and authored blocks survive the TipTap adapter", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  const content = compositionToTiptap([
    ...draft.composition.blocks,
    {
      id: "metrics-1",
      type: "metrics",
      version: 1,
      columns: 2,
      items: [
        {
          id: "metric-1",
          value: { type: "doc", content: [{ type: "text", text: "50%" }] },
          label: { type: "doc", content: [{ type: "text", text: "Faster" }] },
          detail: { type: "doc", content: [] },
        },
      ],
    },
  ])
  const blocks = tiptapToComposition(content)
  expect(blocks.map((block) => block.type)).toEqual([
    "partyHeader",
    "richText",
    "pricing",
    "metrics",
  ])
  expect(() =>
    parseProposalDraft({
      ...draft,
      composition: { version: 1, blocks },
    })
  ).not.toThrow()
})

test("legacy media attributes are normalized instead of entering the model", () => {
  const [block] = tiptapToComposition({
    type: "doc",
    content: [
      {
        type: "gallery",
        attrs: {
          images: [
            {
              id: "image-1",
              url: "https://example.test/image",
              alt: "Example",
            },
          ],
        },
      },
    ],
  })
  expect(block).toEqual({
    id: "gallery-0",
    type: "gallery",
    version: 1,
    columns: 3,
    images: [{ id: "image-1", alt: "Example" }],
  })
})

test("card item child content round-trips rich text marks and empty fields", () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "keyNumbers",
        attrs: { blockId: "metrics-1", columns: 2 },
        content: [
          {
            type: "keyNumbersItem",
            attrs: { id: "metric-1" },
            content: [
              inlineNode("keyNumbersValue", field("50%", [{ type: "bold" }])),
              inlineNode("keyNumbersLabel", field("")),
              blockNode("keyNumbersDetail", paragraph("Faster")),
            ],
          },
        ],
      },
      {
        type: "teamMembers",
        attrs: { blockId: "team-1", columns: 3 },
        content: [
          {
            type: "teamMemberItem",
            attrs: { id: "member-1", sourceId: "contact-1" },
            content: [
              inlineNode("teamMemberName", field("Alex")),
              inlineNode("teamMemberRole", field("")),
              blockNode("teamMemberBio", paragraph("Lead")),
            ],
          },
        ],
      },
      {
        type: "testimonials",
        attrs: { blockId: "testimonials-1", columns: 2 },
        content: [
          {
            type: "testimonialItem",
            attrs: { id: "testimonial-1" },
            content: [
              blockNode("testimonialQuote", paragraph("Excellent")),
              inlineNode("testimonialAuthor", field("Sam")),
              inlineNode("testimonialRole", field("")),
            ],
          },
        ],
      },
    ],
  }

  expect(compositionToTiptap(tiptapToComposition(content))).toEqual(content)
})

test("custom block text is stored in child content instead of attrs", () => {
  const blocks = tiptapToComposition({
    type: "doc",
    content: [
      {
        type: "teamMembers",
        attrs: { blockId: "team-1", columns: 2 },
        content: [
          {
            type: "teamMemberItem",
            attrs: { id: "member-1", sourceId: "contact-1" },
            content: [
              {
                type: "teamMemberName",
                content: [{ type: "text", text: "Alex" }],
              },
              {
                type: "teamMemberRole",
                content: [{ type: "text", text: "Lead" }],
              },
              { type: "teamMemberBio", content: [] },
            ],
          },
        ],
      },
    ],
  })

  const tiptapNode = compositionToTiptap(blocks).content?.[0]
  expect(tiptapNode?.attrs).toEqual({ blockId: "team-1", columns: 2 })
  expect(tiptapNode?.content?.[0]).toMatchObject({
    type: "teamMemberItem",
    attrs: { id: "member-1", sourceId: "contact-1" },
  })
  expect(JSON.stringify(tiptapNode?.attrs)).not.toContain("Alex")
})

test("attr-backed custom block text is ignored", () => {
  const [block] = tiptapToComposition({
    type: "doc",
    content: [
      {
        type: "keyNumbers",
        attrs: {
          blockId: "metrics-1",
          columns: 2,
          items: [{ id: "metric-1", value: field("50%") }],
        },
      },
    ],
  })

  expect(block).toMatchObject({
    type: "metrics",
    items: [],
  })
})

test("block rich text editor content wraps legacy inline documents", () => {
  expect(
    richTextDocToEditorContent(
      { type: "doc", content: [{ type: "text", text: "Inline only" }] },
      false
    )
  ).toEqual({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Inline only" }],
      },
    ],
  })
})

test("proposal sections and FAQ blocks survive the TipTap adapter", () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "proposalSection",
        attrs: { blockId: "section-1", variant: "accent" },
        content: [
          inlineNode("proposalSectionEyebrow", field("Overview")),
          inlineNode(
            "proposalSectionTitle",
            field("Project direction", [{ type: "bold" }])
          ),
          inlineNode(
            "proposalSectionLead",
            field("A concise recommendation.", [{ type: "italic" }])
          ),
          blockNode("proposalSectionBody", paragraph("Build the right thing.")),
        ],
      },
      {
        type: "proposalFaq",
        attrs: { blockId: "faq-1", variant: "list" },
        content: [
          {
            type: "proposalFaqItem",
            attrs: { id: "faq-item-1" },
            content: [
              inlineNode(
                "proposalFaqQuestion",
                field("Can the scope change?", [{ type: "bold" }])
              ),
              blockNode("proposalFaqAnswer", paragraph("Yes, with approval.")),
            ],
          },
        ],
      },
    ],
  }

  expect(compositionToTiptap(tiptapToComposition(content))).toEqual(content)
})

test("phase 2 proposal blocks survive the TipTap adapter", () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "proposalCover",
        attrs: {
          blockId: "cover-1",
          media: { assetId: "asset-1", alt: "Website mockup" },
          variant: "band",
        },
        content: [
          inlineNode("proposalCoverEyebrow", field("Proposal")),
          inlineNode("proposalCoverTitle", field("Growth platform")),
          inlineNode("proposalCoverSubtitle", field("A focused launch plan.")),
        ],
      },
      {
        type: "proposalColumns",
        attrs: { blockId: "columns-1", columns: 2 },
        content: [
          inlineNode("proposalColumnsTitle", field("Workstreams")),
          {
            type: "proposalColumnItem",
            attrs: { id: "column-1" },
            content: [
              inlineNode("proposalColumnHeading", field("Strategy")),
              blockNode("proposalColumnBody", paragraph("Clarify priorities.")),
            ],
          },
        ],
      },
      {
        type: "proposalImageText",
        attrs: {
          blockId: "image-text-1",
          image: { assetId: "asset-1", alt: "Journey map" },
          reverse: true,
        },
        content: [
          inlineNode("proposalImageTextEyebrow", field("Proof")),
          inlineNode("proposalImageTextTitle", field("Evidence-led design")),
          blockNode("proposalImageTextBody", paragraph("Show the rationale.")),
        ],
      },
      {
        type: "proposalImageCards",
        attrs: { blockId: "image-cards-1", columns: 3, variant: "horizontal" },
        content: [
          {
            type: "proposalImageCardItem",
            attrs: {
              id: "card-1",
              image: { assetId: "asset-1", alt: "Service card" },
            },
            content: [
              inlineNode("proposalImageCardTitle", field("Launch")),
              blockNode("proposalImageCardBody", paragraph("Ship confidently.")),
            ],
          },
        ],
      },
      {
        type: "proposalSignature",
        attrs: { blockId: "signature-1", binding: "proposal.pricing.signer" },
        content: [
          inlineNode("proposalSignatureTitle", field("Ready to approve")),
          blockNode("proposalSignatureTerms", paragraph("Confirm the scope.")),
        ],
      },
    ],
  }

  expect(compositionToTiptap(tiptapToComposition(content))).toEqual(content)
})

test("phase 2 proposal blocks normalize unsafe attrs", () => {
  const blocks = tiptapToComposition({
    type: "doc",
    content: [
      {
        type: "proposalCover",
        attrs: {
          blockId: "cover-1",
          media: { url: "https://example.test/image.png", alt: "Image" },
          variant: "unknown",
        },
        content: [
          inlineNode("proposalCoverEyebrow", field("Proposal")),
          inlineNode("proposalCoverTitle", field("Growth platform")),
          inlineNode("proposalCoverSubtitle", field("")),
        ],
      },
      {
        type: "proposalImageCards",
        attrs: {
          blockId: "image-cards-1",
          columns: 9,
          variant: "stacked",
        },
        content: [
          {
            type: "proposalImageCardItem",
            content: [
              inlineNode("proposalImageCardTitle", field("Launch")),
              blockNode("proposalImageCardBody", paragraph("Ship.")),
            ],
          },
        ],
      },
    ],
  })

  expect(blocks[0]).toMatchObject({
    id: "cover-1",
    type: "cover",
    variant: "split",
  })
  expect(blocks[0]).not.toHaveProperty("media")
  expect(blocks[1]).toMatchObject({
    id: "image-cards-1",
    type: "imageCards",
    columns: 3,
    variant: "vertical",
    items: [
      {
        id: "image-cards-1-item-0",
        title: { content: [{ type: "text", text: "Launch" }] },
        body: {
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Ship." }],
            },
          ],
        },
      },
    ],
  })
})
