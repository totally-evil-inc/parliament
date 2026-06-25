import type { JSONContent } from "@tiptap/core"
import type { DocumentBlock, RichTextDoc } from "@workspace/document/schema"

type Attrs = Record<string, unknown>

export function compositionToTiptap(blocks: Array<DocumentBlock>): JSONContent {
  return { type: "doc", content: blocks.flatMap(blockToTiptap) }
}

function blockToTiptap(block: DocumentBlock): Array<JSONContent> {
  switch (block.type) {
    case "partyHeader":
      return [
        {
          type: "documentHeader",
          attrs: {
            blockId: block.id,
            binding: block.binding,
            headerLayout: block.config.layout,
          },
        },
      ]
    case "pricing":
      return [
        {
          type: "lineItems",
          attrs: { blockId: block.id, binding: block.binding },
        },
      ]
    case "richText":
      return block.content.content as Array<JSONContent>
    case "section":
      return [
        {
          type: "proposalSection",
          attrs: {
            blockId: block.id,
            eyebrow: block.eyebrow,
            title: block.title,
            lead: block.lead,
            variant: block.variant,
            content: block.content,
          },
        },
      ]
    case "metrics":
      return [
        {
          type: "keyNumbers",
          attrs: {
            blockId: block.id,
            columns: block.columns,
            items: normalizeKeyNumbers(block),
          },
        },
      ]
    case "team":
      return [
        {
          type: "teamMembers",
          attrs: {
            blockId: block.id,
            columns: block.columns,
            items: normalizeTeamMembers(block),
          },
        },
      ]
    case "testimonials":
      return [
        {
          type: "testimonials",
          attrs: {
            blockId: block.id,
            columns: block.columns,
            items: normalizeTestimonials(block),
          },
        },
      ]
    case "gallery":
      return [
        {
          type: "gallery",
          attrs: {
            blockId: block.id,
            columns: block.columns,
            images: block.images,
          },
        },
      ]
    case "timeline":
      return [
        {
          type: "timeline",
          attrs: { blockId: block.id },
          content: block.content.content as Array<JSONContent>,
        },
      ]
    case "faq":
      return [
        {
          type: "proposalFaq",
          attrs: {
            blockId: block.id,
            variant: block.variant,
            items: block.items,
          },
        },
      ]
  }
}

function attrs(node: JSONContent): Attrs {
  return node.attrs ?? {}
}

function id(node: JSONContent, index: number, prefix: string) {
  const value = attrs(node).blockId
  return typeof value === "string" && value ? value : `${prefix}-${index}`
}

export function tiptapToComposition(
  content: JSONContent
): Array<DocumentBlock> {
  return (content.content ?? []).map((node, index): DocumentBlock => {
    const nodeAttrs = attrs(node)
    if (node.type === "documentHeader") {
      return {
        id: id(node, index, "header"),
        type: "partyHeader",
        version: 1,
        binding: "proposal.parties",
        config: {
          layout:
            typeof nodeAttrs.headerLayout === "string"
              ? nodeAttrs.headerLayout
              : "mark-left-dates-right",
        },
      }
    }
    if (node.type === "lineItems") {
      return {
        id: id(node, index, "pricing"),
        type: "pricing",
        version: 1,
        binding: "proposal.pricing",
        config: { title: "Services & Billing" },
      }
    }
    if (node.type === "proposalSection") {
      return {
        id: id(node, index, "section"),
        type: "section",
        version: 1,
        eyebrow: string(nodeAttrs.eyebrow),
        title: string(nodeAttrs.title),
        lead: string(nodeAttrs.lead),
        variant: sectionVariant(nodeAttrs.variant),
        content: docFromUnknown(nodeAttrs.content),
      }
    }
    if (node.type === "keyNumbers") {
      const blockId = id(node, index, "metrics")
      return {
        id: blockId,
        type: "metrics",
        version: 1,
        columns: columns(nodeAttrs.columns),
        content: itemsToCanonicalMetrics(
          normalizeKeyNumbers({
            id: blockId,
            attrs: nodeAttrs,
            content: node.content,
          })
        ),
      }
    }
    if (node.type === "teamMembers") {
      const blockId = id(node, index, "team")
      return {
        id: blockId,
        type: "team",
        version: 1,
        columns: columns(nodeAttrs.columns),
        content: itemsToCanonicalTeam(
          normalizeTeamMembers({
            id: blockId,
            attrs: nodeAttrs,
            content: node.content,
          })
        ),
      }
    }
    if (node.type === "testimonials") {
      const blockId = id(node, index, "testimonials")
      return {
        id: blockId,
        type: "testimonials",
        version: 1,
        columns: columns(nodeAttrs.columns),
        content: itemsToCanonicalTestimonials(
          normalizeTestimonials({
            id: blockId,
            attrs: nodeAttrs,
            content: node.content,
          })
        ),
      }
    }
    if (node.type === "gallery") {
      const blockId = id(node, index, "gallery")
      return {
        id: blockId,
        type: "gallery",
        version: 1,
        columns: columns(nodeAttrs.columns),
        images: array<Record<string, unknown>>(nodeAttrs.images).map(
          (item, itemIndex) => ({
            id: string(item.id) || `${blockId}-image-${itemIndex}`,
            alt: string(item.alt),
            ...(string(item.assetId) ? { assetId: string(item.assetId) } : {}),
          })
        ),
      }
    }
    if (node.type === "proposalFaq") {
      const blockId = id(node, index, "faq")
      return {
        id: blockId,
        type: "faq",
        version: 1,
        variant: "list",
        items: array<Record<string, unknown>>(nodeAttrs.items).map(
          (item, itemIndex) => ({
            id: string(item.id) || `${blockId}-item-${itemIndex}`,
            question: string(item.question),
            answer: docFromUnknown(item.answer),
          })
        ),
      }
    }
    if (node.type === "timeline") {
      return {
        id: id(node, index, "timeline"),
        type: "timeline",
        version: 1,
        content: doc(node.content),
      }
    }
    return {
      id: id(node, index, "rich-text"),
      type: "richText",
      version: 1,
      content: doc([node]),
    }
  })
}

function doc(content: JSONContent["content"]): RichTextDoc {
  return { type: "doc", content: (content ?? []) as RichTextDoc["content"] }
}

function columns(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 ? value : 3
}

function array<T>(value: unknown): Array<T> {
  return Array.isArray(value) ? (value as Array<T>) : []
}

function string(value: unknown) {
  return typeof value === "string" ? value : ""
}

function sectionVariant(value: unknown): "default" | "accent" | "compact" {
  return value === "accent" || value === "compact" ? value : "default"
}

function docFromUnknown(value: unknown): RichTextDoc {
  if (
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as RichTextDoc
  }
  return { type: "doc", content: [] }
}

// --- Card Blocks Normalizers & Canonicalizers ---

function textToDoc(text: unknown): RichTextDoc {
  const str = typeof text === "string" ? text : ""
  if (!str) return { type: "doc", content: [] }
  return {
    type: "doc",
    content: [{ type: "text", text: str }],
  }
}

function normalizeKeyNumbers(block: any): Array<any> {
  const existingItems = block.attrs?.items ?? block.items
  if (Array.isArray(existingItems)) {
    return existingItems.map((item, index) => ({
      ...item,
      id: item.id ?? `${block.id || "metrics"}-item-${index}`,
    }))
  }

  const content = block.content?.content ?? block.content ?? []
  const itemsFromContent = content.filter(
    (n: any) => n.type === "keyNumbersItem"
  )
  if (itemsFromContent.length > 0) {
    return itemsFromContent.map((item: any, idx: number) => {
      const children = item.content ?? []
      const valueNode = children.find((c: any) => c.type === "keyNumbersValue")
      const labelNode = children.find((c: any) => c.type === "keyNumbersLabel")
      const detailNode = children.find(
        (c: any) => c.type === "keyNumbersDetail"
      )
      return {
        id: item.attrs?.id ?? `${block.id || "metrics"}-item-${idx}`,
        value: { type: "doc", content: valueNode?.content ?? [] },
        label: { type: "doc", content: labelNode?.content ?? [] },
        detail: { type: "doc", content: detailNode?.content ?? [] },
      }
    })
  }

  const legacyMetrics = block.attrs?.metrics ?? block.metrics ?? []
  if (legacyMetrics.length > 0) {
    return legacyMetrics.map((m: any, idx: number) => ({
      id: m.id ?? `${block.id || "metrics"}-item-${idx}`,
      value: textToDoc(m.value),
      label: textToDoc(m.label),
      detail: textToDoc(m.detail),
    }))
  }

  return []
}

function normalizeTeamMembers(block: any): Array<any> {
  const existingItems = block.attrs?.items ?? block.items
  if (Array.isArray(existingItems)) {
    return existingItems.map((item, index) => ({
      ...item,
      id: item.id ?? `${block.id || "team"}-item-${index}`,
    }))
  }

  const content = block.content?.content ?? block.content ?? []
  const itemsFromContent = content.filter(
    (n: any) => n.type === "teamMemberItem"
  )
  if (itemsFromContent.length > 0) {
    return itemsFromContent.map((item: any, idx: number) => {
      const children = item.content ?? []
      const nameNode = children.find((c: any) => c.type === "teamMemberName")
      const roleNode = children.find((c: any) => c.type === "teamMemberRole")
      const bioNode = children.find((c: any) => c.type === "teamMemberBio")
      return {
        id: item.attrs?.id ?? `${block.id || "team"}-item-${idx}`,
        ...(item.attrs?.sourceId ? { sourceId: item.attrs.sourceId } : {}),
        name: { type: "doc", content: nameNode?.content ?? [] },
        role: { type: "doc", content: roleNode?.content ?? [] },
        bio: { type: "doc", content: bioNode?.content ?? [] },
      }
    })
  }

  const legacyMembers = block.attrs?.members ?? block.members ?? []
  if (legacyMembers.length > 0) {
    return legacyMembers.map((m: any, idx: number) => ({
      id: m.id ?? `${block.id || "team"}-item-${idx}`,
      name: textToDoc(m.name),
      role: textToDoc(m.role),
      bio: textToDoc(m.bio),
      ...(m.sourceId ? { sourceId: m.sourceId } : {}),
    }))
  }

  return []
}

function normalizeTestimonials(block: any): Array<any> {
  const existingItems = block.attrs?.items ?? block.items
  if (Array.isArray(existingItems)) {
    return existingItems.map((item, index) => ({
      ...item,
      id: item.id ?? `${block.id || "testimonials"}-item-${index}`,
    }))
  }

  const content = block.content?.content ?? block.content ?? []
  const itemsFromContent = content.filter(
    (n: any) => n.type === "testimonialItem"
  )
  if (itemsFromContent.length > 0) {
    return itemsFromContent.map((item: any, idx: number) => {
      const children = item.content ?? []
      const quoteNode = children.find((c: any) => c.type === "testimonialQuote")
      const authorNode = children.find(
        (c: any) => c.type === "testimonialAuthor"
      )
      const roleNode = children.find((c: any) => c.type === "testimonialRole")
      return {
        id: item.attrs?.id ?? `${block.id || "testimonials"}-item-${idx}`,
        ...(item.attrs?.sourceId ? { sourceId: item.attrs.sourceId } : {}),
        quote: { type: "doc", content: quoteNode?.content ?? [] },
        author: { type: "doc", content: authorNode?.content ?? [] },
        role: { type: "doc", content: roleNode?.content ?? [] },
      }
    })
  }

  const legacyTestimonials =
    block.attrs?.testimonials ?? block.testimonials ?? []
  if (legacyTestimonials.length > 0) {
    return legacyTestimonials.map((t: any, idx: number) => ({
      id: t.id ?? `${block.id || "testimonials"}-item-${idx}`,
      quote: textToDoc(t.content ?? t.quote),
      author: textToDoc(t.author),
      role: textToDoc(t.role),
      ...(t.sourceId ? { sourceId: t.sourceId } : {}),
    }))
  }

  return []
}

function itemsToCanonicalMetrics(items: Array<any>): RichTextDoc {
  return {
    type: "doc",
    content: (items ?? []).map((item) => ({
      type: "keyNumbersItem",
      attrs: { id: item.id },
      content: [
        { type: "keyNumbersValue", content: item.value?.content ?? [] },
        { type: "keyNumbersLabel", content: item.label?.content ?? [] },
        { type: "keyNumbersDetail", content: item.detail?.content ?? [] },
      ],
    })),
  }
}

function itemsToCanonicalTeam(items: Array<any>): RichTextDoc {
  return {
    type: "doc",
    content: (items ?? []).map((item) => ({
      type: "teamMemberItem",
      attrs: {
        id: item.id,
        ...(item.sourceId ? { sourceId: item.sourceId } : {}),
      },
      content: [
        { type: "teamMemberName", content: item.name?.content ?? [] },
        { type: "teamMemberRole", content: item.role?.content ?? [] },
        { type: "teamMemberBio", content: item.bio?.content ?? [] },
      ],
    })),
  }
}

function itemsToCanonicalTestimonials(items: Array<any>): RichTextDoc {
  return {
    type: "doc",
    content: (items ?? []).map((item) => ({
      type: "testimonialItem",
      attrs: {
        id: item.id,
        ...(item.sourceId ? { sourceId: item.sourceId } : {}),
      },
      content: [
        { type: "testimonialQuote", content: item.quote?.content ?? [] },
        { type: "testimonialAuthor", content: item.author?.content ?? [] },
        { type: "testimonialRole", content: item.role?.content ?? [] },
      ],
    })),
  }
}
