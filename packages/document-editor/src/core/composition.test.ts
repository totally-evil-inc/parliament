import { expect, test } from "bun:test"
import { createProposalDraft } from "@workspace/document/proposal"
import { parseProposalDraft } from "@workspace/document/schema"
import { compositionToTiptap, tiptapToComposition } from "./composition"

test("bound and authored blocks survive the TipTap adapter", () => {
  const draft = createProposalDraft({ id: "proposal-1" })
  const content = compositionToTiptap([
    ...draft.composition.blocks,
    {
      id: "metrics-1",
      type: "metrics",
      version: 1,
      columns: 2,
      content: {
        type: "doc",
        content: [
          {
            type: "keyNumbersItem",
            content: [
              {
                type: "keyNumbersValue",
                content: [{ type: "text", text: "50%" }],
              },
              {
                type: "keyNumbersLabel",
                content: [{ type: "text", text: "Faster" }],
              },
              {
                type: "keyNumbersDetail",
                content: [],
              },
            ],
          },
        ],
      },
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

test("card item attributes round-trip rich text marks and empty fields", () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "keyNumbers",
        attrs: {
          blockId: "metrics-1",
          columns: 2,
          items: [
            {
              id: "metric-1",
              value: {
                type: "doc",
                content: [
                  { type: "text", text: "50%", marks: [{ type: "bold" }] },
                ],
              },
              label: { type: "doc", content: [] },
              detail: {
                type: "doc",
                content: [{ type: "text", text: "Faster" }],
              },
            },
          ],
        },
      },
      {
        type: "teamMembers",
        attrs: {
          blockId: "team-1",
          columns: 3,
          items: [
            {
              id: "member-1",
              sourceId: "contact-1",
              name: { type: "doc", content: [{ type: "text", text: "Alex" }] },
              role: { type: "doc", content: [] },
              bio: { type: "doc", content: [{ type: "text", text: "Lead" }] },
            },
          ],
        },
      },
      {
        type: "testimonials",
        attrs: {
          blockId: "testimonials-1",
          columns: 2,
          items: [
            {
              id: "testimonial-1",
              quote: {
                type: "doc",
                content: [
                  {
                    type: "text",
                    text: "Excellent",
                    marks: [{ type: "italic" }],
                  },
                ],
              },
              author: { type: "doc", content: [{ type: "text", text: "Sam" }] },
              role: { type: "doc", content: [] },
            },
          ],
        },
      },
    ],
  }

  expect(compositionToTiptap(tiptapToComposition(content))).toEqual(content)
})

test("current nested card nodes normalize into item attributes", () => {
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

  expect(compositionToTiptap(blocks).content?.[0].attrs).toEqual({
    blockId: "team-1",
    columns: 2,
    items: [
      {
        id: "member-1",
        sourceId: "contact-1",
        name: { type: "doc", content: [{ type: "text", text: "Alex" }] },
        role: { type: "doc", content: [{ type: "text", text: "Lead" }] },
        bio: { type: "doc", content: [] },
      },
    ],
  })
})

test("legacy card arrays normalize into inline rich text items", () => {
  const blocks = tiptapToComposition({
    type: "doc",
    content: [
      {
        type: "keyNumbers",
        attrs: {
          blockId: "metrics-1",
          columns: 2,
          metrics: [{ id: "metric-1", value: "50%", label: "Faster" }],
        },
      },
      {
        type: "testimonials",
        attrs: {
          blockId: "testimonials-1",
          columns: 3,
          testimonials: [
            {
              id: "testimonial-1",
              content: "Excellent",
              author: "Sam",
              role: "CEO",
            },
          ],
        },
      },
    ],
  })

  const normalized = compositionToTiptap(blocks).content ?? []
  expect(normalized[0].attrs?.items[0].value.content).toEqual([
    { type: "text", text: "50%" },
  ])
  expect(normalized[1].attrs?.items[0].quote.content).toEqual([
    { type: "text", text: "Excellent" },
  ])
})
