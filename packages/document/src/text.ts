import type { InvoiceRenderModel, ProposalRenderModel } from "./render"
import type { DocumentBlock, RichTextNode } from "./schema"

function richText(node: RichTextNode): string {
  const own = node.text ?? ""
  const children = (node.content ?? []).map(richText).filter(Boolean)
  return [own, ...children]
    .filter(Boolean)
    .join(node.type === "paragraph" ? " " : "\n")
}

export function stripHtml(html: string): string {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "")
}

function blockText(
  block: DocumentBlock,
  model: ProposalRenderModel | InvoiceRenderModel
): string {
  switch (block.type) {
    case "partyHeader":
      return [
        stripHtml(model.title),
        model.seller.name,
        stripHtml(model.seller.address),
        model.customer.name,
        stripHtml(model.customer.address),
      ]
        .filter(Boolean)
        .join("\n")
    case "pricing":
      return (
        model.pricing?.items
          .map((item) =>
            [stripHtml(item.description), stripHtml(item.details)]
              .filter(Boolean)
              .join(" ")
          )
          .join("\n") ?? ""
      )
    case "richText":
    case "timeline":
      return richText(block.content)
    case "metrics":
      return block.items
        .flatMap((item) => [
          richText(item.value),
          richText(item.label),
          richText(item.detail),
        ])
        .filter(Boolean)
        .join("\n")
    case "team":
      return block.items
        .flatMap((item) => [
          richText(item.name),
          richText(item.role),
          richText(item.bio),
        ])
        .filter(Boolean)
        .join("\n")
    case "testimonials":
      return block.items
        .flatMap((item) => [
          richText(item.quote),
          richText(item.author),
          richText(item.role),
        ])
        .filter(Boolean)
        .join("\n")
    case "section":
      return [
        richText(block.eyebrow),
        richText(block.title),
        richText(block.lead),
        richText(block.content),
      ]
        .filter(Boolean)
        .join("\n")
    case "cover":
      return [
        richText(block.eyebrow),
        richText(block.title),
        richText(block.subtitle),
        block.media?.alt,
      ]
        .filter(Boolean)
        .join("\n")
    case "columns":
      return [
        richText(block.title),
        ...block.items.flatMap((item) => [
          richText(item.heading),
          richText(item.body),
        ]),
      ]
        .filter(Boolean)
        .join("\n")
    case "imageText":
      return [
        block.image?.alt,
        richText(block.eyebrow),
        richText(block.title),
        richText(block.content),
      ]
        .filter(Boolean)
        .join("\n")
    case "imageCards":
      return block.items
        .flatMap((item) => [
          item.image?.alt,
          richText(item.title),
          richText(item.body),
        ])
        .filter(Boolean)
        .join("\n")
    case "signature":
      return [richText(block.title), richText(block.terms)]
        .filter(Boolean)
        .join("\n")
    case "faq":
      return block.items
        .map((item) =>
          [richText(item.question), richText(item.answer)].join("\n")
        )
        .join("\n")
    case "gallery":
      return block.images.map((image) => image.alt).join("\n")
  }
}

export function extractProposalText(model: ProposalRenderModel) {
  return model.blocks
    .map((block) => blockText(block, model))
    .filter(Boolean)
    .join("\n\n")
}

export function extractInvoiceText(model: InvoiceRenderModel) {
  return model.blocks
    .map((block) => blockText(block, model))
    .filter(Boolean)
    .join("\n\n")
}
