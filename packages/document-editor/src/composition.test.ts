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
      metrics: [{ id: "metric-1", value: "50%", label: "Faster" }],
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
