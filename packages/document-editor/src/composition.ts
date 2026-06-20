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
    case "metrics":
      return [
        {
          type: "keyNumbers",
          attrs: {
            blockId: block.id,
            columns: block.columns,
            metrics: block.metrics,
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
            members: block.members,
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
            testimonials: block.testimonials,
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
    if (node.type === "keyNumbers") {
      const blockId = id(node, index, "metrics")
      return {
        id: blockId,
        type: "metrics",
        version: 1,
        columns: columns(nodeAttrs.columns),
        metrics: array<Record<string, unknown>>(nodeAttrs.metrics).map(
          (item, itemIndex) => ({
            id: string(item.id) || `${blockId}-metric-${itemIndex}`,
            value: string(item.value),
            label: string(item.label),
            ...(string(item.detail) ? { detail: string(item.detail) } : {}),
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
        members: array<Record<string, unknown>>(nodeAttrs.members).map(
          (item, itemIndex) => ({
            id: string(item.id) || `${blockId}-member-${itemIndex}`,
            name: string(item.name),
            role: string(item.role),
            ...(string(item.bio) ? { bio: string(item.bio) } : {}),
            ...(string(item.sourceId)
              ? { sourceId: string(item.sourceId) }
              : {}),
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
        testimonials: array<Record<string, unknown>>(
          nodeAttrs.testimonials
        ).map((item, itemIndex) => ({
          id: string(item.id) || `${blockId}-testimonial-${itemIndex}`,
          content: string(item.content),
          author: string(item.author),
          role: string(item.role),
          ...(string(item.sourceId) ? { sourceId: string(item.sourceId) } : {}),
        })),
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
