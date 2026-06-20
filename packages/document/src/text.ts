import type { DocumentBlock, RichTextNode } from "./schema"
import type { ProposalRenderModel } from "./render"

function richText(node: RichTextNode): string {
  const own = node.text ?? ""
  const children = (node.content ?? []).map(richText).filter(Boolean)
  return [own, ...children]
    .filter(Boolean)
    .join(node.type === "paragraph" ? " " : "\n")
}

function blockText(block: DocumentBlock, model: ProposalRenderModel): string {
  switch (block.type) {
    case "partyHeader":
      return [model.title, model.seller.name, model.customer.name]
        .filter(Boolean)
        .join("\n")
    case "pricing":
      return (
        model.pricing?.items
          .map((item) =>
            [item.description, item.details].filter(Boolean).join(" ")
          )
          .join("\n") ?? ""
      )
    case "richText":
    case "timeline":
      return richText(block.content)
    case "metrics":
      return block.metrics
        .map((metric) =>
          [metric.value, metric.label, metric.detail].filter(Boolean).join(" ")
        )
        .join("\n")
    case "team":
      return block.members
        .map((member) =>
          [member.name, member.role, member.bio].filter(Boolean).join(" ")
        )
        .join("\n")
    case "testimonials":
      return block.testimonials
        .map((item) => [item.content, item.author, item.role].join(" "))
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
