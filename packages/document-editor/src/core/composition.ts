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
        node("proposalSection", { blockId: block.id, variant: block.variant }, [
          inlineField("proposalSectionEyebrow", block.eyebrow),
          inlineField("proposalSectionTitle", block.title),
          inlineField("proposalSectionLead", block.lead),
          blockField("proposalSectionBody", block.content),
        ]),
      ]
    case "cover":
      return [
        node(
          "proposalCover",
          {
            blockId: block.id,
            media: block.media,
            variant: block.variant,
          },
          [
            inlineField("proposalCoverEyebrow", block.eyebrow),
            inlineField("proposalCoverTitle", block.title),
            inlineField("proposalCoverSubtitle", block.subtitle),
          ]
        ),
      ]
    case "columns":
      return [
        node("proposalColumns", { blockId: block.id, columns: block.columns }, [
          inlineField("proposalColumnsTitle", block.title),
          ...block.items.map((item) =>
            node("proposalColumnItem", { id: item.id }, [
              inlineField("proposalColumnHeading", item.heading),
              blockField("proposalColumnBody", item.body),
            ])
          ),
        ]),
      ]
    case "imageText":
      return [
        node(
          "proposalImageText",
          {
            blockId: block.id,
            image: block.image,
            reverse: block.reverse,
          },
          [
            inlineField("proposalImageTextEyebrow", block.eyebrow),
            inlineField("proposalImageTextTitle", block.title),
            blockField("proposalImageTextBody", block.content),
          ]
        ),
      ]
    case "imageCards":
      return [
        node(
          "proposalImageCards",
          {
            blockId: block.id,
            columns: block.columns,
            variant: block.variant,
          },
          block.items.map((item) =>
            node("proposalImageCardItem", { id: item.id, image: item.image }, [
              inlineField("proposalImageCardTitle", item.title),
              blockField("proposalImageCardBody", item.body),
            ])
          )
        ),
      ]
    case "signature":
      return [
        node(
          "proposalSignature",
          { blockId: block.id, binding: block.binding },
          [
            inlineField("proposalSignatureTitle", block.title),
            blockField("proposalSignatureTerms", block.terms),
          ]
        ),
      ]
    case "metrics":
      return [
        node(
          "keyNumbers",
          { blockId: block.id, columns: block.columns },
          block.items.map((item) =>
            node("keyNumbersItem", { id: item.id }, [
              inlineField("keyNumbersValue", item.value),
              inlineField("keyNumbersLabel", item.label),
              blockField("keyNumbersDetail", item.detail),
            ])
          )
        ),
      ]
    case "team":
      return [
        node(
          "teamMembers",
          { blockId: block.id, columns: block.columns },
          block.items.map((item) =>
            node("teamMemberItem", { id: item.id, sourceId: item.sourceId }, [
              inlineField("teamMemberName", item.name),
              inlineField("teamMemberRole", item.role),
              blockField("teamMemberBio", item.bio),
            ])
          )
        ),
      ]
    case "testimonials":
      return [
        node(
          "testimonials",
          { blockId: block.id, columns: block.columns },
          block.items.map((item) =>
            node("testimonialItem", { id: item.id, sourceId: item.sourceId }, [
              blockField("testimonialQuote", item.quote),
              inlineField("testimonialAuthor", item.author),
              inlineField("testimonialRole", item.role),
            ])
          )
        ),
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
        node(
          "proposalFaq",
          { blockId: block.id, variant: block.variant },
          block.items.map((item) =>
            node("proposalFaqItem", { id: item.id }, [
              inlineField("proposalFaqQuestion", item.question),
              blockField("proposalFaqAnswer", item.answer),
            ])
          )
        ),
      ]
  }
}

function node(
  type: string,
  attrs: Attrs,
  content: Array<JSONContent>
): JSONContent {
  return { type, attrs: compactAttrs(attrs), content }
}

function compactAttrs(attrs: Attrs): Attrs {
  return Object.fromEntries(
    Object.entries(attrs).filter(([, value]) => value !== undefined)
  )
}

function inlineField(type: string, value: RichTextDoc): JSONContent {
  return { type, content: value.content as Array<JSONContent> }
}

function blockField(type: string, value: RichTextDoc): JSONContent {
  return { type, content: blockContent(value) }
}

function blockContent(value: RichTextDoc): Array<JSONContent> {
  const content = value.content as Array<JSONContent>
  return content.length > 0 ? content : [{ type: "paragraph" }]
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
      const binding =
        typeof nodeAttrs.binding === "string" &&
        (nodeAttrs.binding === "proposal.parties" ||
          nodeAttrs.binding === "invoice.parties")
          ? nodeAttrs.binding
          : "proposal.parties"
      return {
        id: id(node, index, "header"),
        type: "partyHeader",
        version: 1,
        binding,
        config: {
          layout:
            typeof nodeAttrs.headerLayout === "string"
              ? nodeAttrs.headerLayout
              : "mark-left-dates-right",
        },
      }
    }
    if (node.type === "lineItems") {
      const binding =
        typeof nodeAttrs.binding === "string" &&
        (nodeAttrs.binding === "proposal.pricing" ||
          nodeAttrs.binding === "invoice.pricing")
          ? nodeAttrs.binding
          : "proposal.pricing"
      return {
        id: id(node, index, "pricing"),
        type: "pricing",
        version: 1,
        binding,
        config: { title: "Services & Billing" },
      }
    }
    if (node.type === "proposalSection") {
      return {
        id: id(node, index, "section"),
        type: "section",
        version: 1,
        eyebrow: inlineDoc(node, "proposalSectionEyebrow"),
        title: inlineDoc(node, "proposalSectionTitle"),
        lead: inlineDoc(node, "proposalSectionLead"),
        variant: sectionVariant(nodeAttrs.variant),
        content: blockDoc(node, "proposalSectionBody"),
      }
    }
    if (node.type === "proposalCover") {
      const media = assetReference(nodeAttrs.media)
      return {
        id: id(node, index, "cover"),
        type: "cover",
        version: 1,
        eyebrow: inlineDoc(node, "proposalCoverEyebrow"),
        title: inlineDoc(node, "proposalCoverTitle"),
        subtitle: inlineDoc(node, "proposalCoverSubtitle"),
        ...(media ? { media } : {}),
        variant: coverVariant(nodeAttrs.variant),
      }
    }
    if (node.type === "proposalColumns") {
      const blockId = id(node, index, "columns")
      return {
        id: blockId,
        type: "columns",
        version: 1,
        columns: narrativeColumns(nodeAttrs.columns),
        title: inlineDoc(node, "proposalColumnsTitle"),
        items: children(node, "proposalColumnItem").map((item, itemIndex) => ({
          id: itemId(item, blockId, itemIndex),
          heading: inlineDoc(item, "proposalColumnHeading"),
          body: blockDoc(item, "proposalColumnBody"),
        })),
      }
    }
    if (node.type === "proposalImageText") {
      const image = assetReference(nodeAttrs.image)
      return {
        id: id(node, index, "image-text"),
        type: "imageText",
        version: 1,
        ...(image ? { image } : {}),
        eyebrow: inlineDoc(node, "proposalImageTextEyebrow"),
        title: inlineDoc(node, "proposalImageTextTitle"),
        content: blockDoc(node, "proposalImageTextBody"),
        reverse: nodeAttrs.reverse === true,
      }
    }
    if (node.type === "proposalImageCards") {
      const blockId = id(node, index, "image-cards")
      return {
        id: blockId,
        type: "imageCards",
        version: 1,
        columns: columns(nodeAttrs.columns),
        variant: imageCardsVariant(nodeAttrs.variant),
        items: children(node, "proposalImageCardItem").map(
          (item, itemIndex) => {
            const image = assetReference(attrs(item).image)
            return {
              id: itemId(item, blockId, itemIndex),
              ...(image ? { image } : {}),
              title: inlineDoc(item, "proposalImageCardTitle"),
              body: blockDoc(item, "proposalImageCardBody"),
            }
          }
        ),
      }
    }
    if (node.type === "proposalSignature") {
      return {
        id: id(node, index, "signature"),
        type: "signature",
        version: 1,
        binding: "proposal.pricing.signer",
        title: inlineDoc(node, "proposalSignatureTitle"),
        terms: blockDoc(node, "proposalSignatureTerms"),
      }
    }
    if (node.type === "keyNumbers") {
      const blockId = id(node, index, "metrics")
      return {
        id: blockId,
        type: "metrics",
        version: 1,
        columns: columns(nodeAttrs.columns),
        items: children(node, "keyNumbersItem").map((item, itemIndex) => ({
          id: itemId(item, blockId, itemIndex),
          value: inlineDoc(item, "keyNumbersValue"),
          label: inlineDoc(item, "keyNumbersLabel"),
          detail: blockDoc(item, "keyNumbersDetail"),
        })),
      }
    }
    if (node.type === "teamMembers") {
      const blockId = id(node, index, "team")
      return {
        id: blockId,
        type: "team",
        version: 1,
        columns: columns(nodeAttrs.columns),
        items: children(node, "teamMemberItem").map((item, itemIndex) => ({
          id: itemId(item, blockId, itemIndex),
          ...(string(attrs(item).sourceId)
            ? { sourceId: string(attrs(item).sourceId) }
            : {}),
          name: inlineDoc(item, "teamMemberName"),
          role: inlineDoc(item, "teamMemberRole"),
          bio: blockDoc(item, "teamMemberBio"),
        })),
      }
    }
    if (node.type === "testimonials") {
      const blockId = id(node, index, "testimonials")
      return {
        id: blockId,
        type: "testimonials",
        version: 1,
        columns: columns(nodeAttrs.columns),
        items: children(node, "testimonialItem").map((item, itemIndex) => ({
          id: itemId(item, blockId, itemIndex),
          ...(string(attrs(item).sourceId)
            ? { sourceId: string(attrs(item).sourceId) }
            : {}),
          quote: blockDoc(item, "testimonialQuote"),
          author: inlineDoc(item, "testimonialAuthor"),
          role: inlineDoc(item, "testimonialRole"),
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
    if (node.type === "proposalFaq") {
      const blockId = id(node, index, "faq")
      return {
        id: blockId,
        type: "faq",
        version: 1,
        variant: "list",
        items: children(node, "proposalFaqItem").map((item, itemIndex) => ({
          id: itemId(item, blockId, itemIndex),
          question: inlineDoc(item, "proposalFaqQuestion"),
          answer: blockDoc(item, "proposalFaqAnswer"),
        })),
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

function children(node: JSONContent, type: string): Array<JSONContent> {
  return (node.content ?? []).filter((child) => child.type === type)
}

function child(node: JSONContent, type: string): JSONContent | undefined {
  return children(node, type)[0]
}

function inlineDoc(node: JSONContent, type: string): RichTextDoc {
  return doc(child(node, type)?.content)
}

function blockDoc(node: JSONContent, type: string): RichTextDoc {
  return doc(child(node, type)?.content)
}

function itemId(node: JSONContent, blockId: string, index: number) {
  const value = attrs(node).id
  return typeof value === "string" && value ? value : `${blockId}-item-${index}`
}

function columns(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 ? value : 3
}

function narrativeColumns(value: unknown): 2 | 3 {
  return value === 2 ? 2 : 3
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

function coverVariant(value: unknown): "split" | "band" | "minimal" {
  if (value === "band" || value === "minimal") return value
  return "split"
}

function imageCardsVariant(value: unknown): "vertical" | "horizontal" {
  return value === "horizontal" ? "horizontal" : "vertical"
}

function assetReference(value: unknown) {
  if (!value || typeof value !== "object") return null
  const assetId = string((value as Record<string, unknown>).assetId)
  if (!assetId) return null
  return {
    assetId,
    alt: string((value as Record<string, unknown>).alt),
  }
}
