import {
  calculateInvoicePricing,
  calculateProposalPricing,
} from "./calculate"
import { webStudioProposalTemplate } from "./presentation"
import type {
  DocumentBlock,
  InvoiceDraft,
  PricingItem,
  ProposalDraft,
  ProposalPricing,
  RichTextDoc,
  RichTextNode,
} from "./schema"

export function textDoc(text: string): RichTextDoc {
  if (!text) {
    return { type: "doc", content: [] }
  }
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  }
}

export function inlineDoc(text: string): RichTextDoc {
  if (!text) {
    return { type: "doc", content: [] }
  }
  return {
    type: "doc",
    content: [{ type: "text", text }],
  }
}

export function buildSectionBlock({
  id,
  eyebrow = "",
  title,
  lead = "",
  variant = "default",
  content,
}: {
  id?: string
  eyebrow?: string
  title: string
  lead?: string
  variant?: "default" | "accent" | "compact"
  content: string | RichTextDoc
}): DocumentBlock {
  return {
    id: id || `section-${Math.random().toString(36).slice(2, 9)}`,
    type: "section",
    version: 1,
    eyebrow: inlineDoc(eyebrow),
    title: inlineDoc(title),
    lead: inlineDoc(lead),
    variant,
    content: typeof content === "string" ? textDoc(content) : content,
  }
}

export function buildMetricsBlock({
  id,
  columns = 3,
  items,
}: {
  id?: string
  columns?: 1 | 2 | 3
  items: Array<{
    id?: string
    value: string
    label: string
    detail?: string
  }>
}): DocumentBlock {
  return {
    id: id || `metrics-${Math.random().toString(36).slice(2, 9)}`,
    type: "metrics",
    version: 1,
    columns,
    items: items.map((item, idx) => ({
      id: item.id || `metric-${idx + 1}`,
      value: inlineDoc(item.value),
      label: inlineDoc(item.label),
      detail: textDoc(item.detail || ""),
    })),
  }
}

export function buildTimelineBlock({
  id,
  items,
}: {
  id?: string
  items: Array<{
    date: string
    title: string
    description?: string
  }>
}): DocumentBlock {
  const timelineNodes: RichTextNode[] = items.map((item) => ({
    type: "timelineItem",
    content: [
      {
        type: "timelineDate",
        content: [{ type: "text", text: item.date }],
      },
      {
        type: "timelineTitle",
        content: [{ type: "text", text: item.title }],
      },
      {
        type: "timelineDescription",
        content: item.description
          ? [
              {
                type: "paragraph",
                content: [{ type: "text", text: item.description }],
              },
            ]
          : [],
      },
    ],
  }))

  return {
    id: id || `timeline-${Math.random().toString(36).slice(2, 9)}`,
    type: "timeline",
    version: 1,
    content: {
      type: "doc",
      content: timelineNodes,
    },
  }
}

export function buildTeamBlock({
  id,
  columns = 3,
  items,
}: {
  id?: string
  columns?: 1 | 2 | 3
  items: Array<{
    id?: string
    name: string
    role: string
    bio?: string
  }>
}): DocumentBlock {
  return {
    id: id || `team-${Math.random().toString(36).slice(2, 9)}`,
    type: "team",
    version: 1,
    columns,
    items: items.map((item, idx) => ({
      id: item.id || `team-member-${idx + 1}`,
      name: inlineDoc(item.name),
      role: inlineDoc(item.role),
      bio: textDoc(item.bio || ""),
    })),
  }
}

export function buildTestimonialsBlock({
  id,
  columns = 2,
  items,
}: {
  id?: string
  columns?: 1 | 2 | 3
  items: Array<{
    id?: string
    quote: string
    author: string
    role?: string
  }>
}): DocumentBlock {
  return {
    id: id || `testimonials-${Math.random().toString(36).slice(2, 9)}`,
    type: "testimonials",
    version: 1,
    columns,
    items: items.map((item, idx) => ({
      id: item.id || `testimonial-${idx + 1}`,
      quote: textDoc(item.quote),
      author: inlineDoc(item.author),
      role: inlineDoc(item.role || ""),
    })),
  }
}

export function buildFaqBlock({
  id,
  items,
}: {
  id?: string
  items: Array<{
    id?: string
    question: string
    answer: string
  }>
}): DocumentBlock {
  return {
    id: id || `faq-${Math.random().toString(36).slice(2, 9)}`,
    type: "faq",
    version: 1,
    variant: "list",
    items: items.map((item, idx) => ({
      id: item.id || `faq-${idx + 1}`,
      question: inlineDoc(item.question),
      answer: textDoc(item.answer),
    })),
  }
}

export function buildSignatureBlock({
  id,
  title = "Signatures & Acceptance",
  terms = "By signing below, the parties agree to the terms outlined in this proposal.",
}: {
  id?: string
  title?: string
  terms?: string
} = {}): DocumentBlock {
  return {
    id: id || "proposal-signature",
    type: "signature",
    version: 1,
    binding: "proposal.pricing.signer",
    title: inlineDoc(title),
    terms: textDoc(terms),
  }
}

export function buildPartyHeaderBlock({
  id = "proposal-header",
  layout = "editorial-band",
  binding = "proposal.parties",
}: {
  id?: string
  layout?: string
  binding?: "proposal.parties" | "invoice.parties"
} = {}): DocumentBlock {
  return {
    id,
    type: "partyHeader",
    version: 1,
    binding,
    config: { layout },
  }
}

export function buildPricingBlock({
  id = "proposal-pricing",
  title = "Services & Billing",
  binding = "proposal.pricing",
}: {
  id?: string
  title?: string
  binding?: "proposal.pricing" | "invoice.pricing"
} = {}): DocumentBlock {
  return {
    id,
    type: "pricing",
    version: 1,
    binding,
    config: { title },
  }
}

export function buildColumnsBlock({
  id,
  title = "",
  columns = 2,
  items,
}: {
  id?: string
  title?: string
  columns?: 2 | 3
  items: Array<{
    id?: string
    heading: string
    body: string
  }>
}): DocumentBlock {
  return {
    id: id || `columns-${Math.random().toString(36).slice(2, 9)}`,
    type: "columns",
    version: 1,
    columns,
    title: inlineDoc(title),
    items: items.map((item, idx) => ({
      id: item.id || `col-${idx + 1}`,
      heading: inlineDoc(item.heading),
      body: textDoc(item.body),
    })),
  }
}

export function buildCoverBlock({
  id,
  eyebrow = "",
  title,
  subtitle = "",
  variant = "split",
}: {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  variant?: "split" | "band" | "minimal"
}): DocumentBlock {
  return {
    id: id || `cover-${Math.random().toString(36).slice(2, 9)}`,
    type: "cover",
    version: 1,
    eyebrow: inlineDoc(eyebrow),
    title: inlineDoc(title),
    subtitle: inlineDoc(subtitle),
    variant,
  }
}

export type DeclarativeBlockInput =
  | {
      type: "section"
      id?: string
      eyebrow?: string
      title: string
      lead?: string
      variant?: "default" | "accent" | "compact"
      content: string
    }
  | {
      type: "metrics"
      id?: string
      columns?: 1 | 2 | 3
      items: Array<{ value: string; label: string; detail?: string }>
    }
  | {
      type: "timeline"
      id?: string
      items: Array<{ date: string; title: string; description?: string }>
    }
  | {
      type: "team"
      id?: string
      columns?: 1 | 2 | 3
      items: Array<{ name: string; role: string; bio?: string }>
    }
  | {
      type: "testimonials"
      id?: string
      columns?: 1 | 2 | 3
      items: Array<{ quote: string; author: string; role?: string }>
    }
  | {
      type: "faq"
      id?: string
      items: Array<{ question: string; answer: string }>
    }
  | {
      type: "signature"
      id?: string
      title?: string
      terms?: string
    }
  | {
      type: "columns"
      id?: string
      title?: string
      columns?: 2 | 3
      items: Array<{ heading: string; body: string }>
    }
  | {
      type: "cover"
      id?: string
      eyebrow?: string
      title: string
      subtitle?: string
      variant?: "split" | "band" | "minimal"
    }

export function convertDeclarativeBlock(input: DeclarativeBlockInput): DocumentBlock {
  switch (input.type) {
    case "section":
      return buildSectionBlock(input)
    case "metrics":
      return buildMetricsBlock(input)
    case "timeline":
      return buildTimelineBlock(input)
    case "team":
      return buildTeamBlock(input)
    case "testimonials":
      return buildTestimonialsBlock(input)
    case "faq":
      return buildFaqBlock(input)
    case "signature":
      return buildSignatureBlock(input)
    case "columns":
      return buildColumnsBlock(input)
    case "cover":
      return buildCoverBlock(input)
  }
}

/**
 * Enforces structural invariants on document blocks:
 * 1. Guarantees single partyHeader block at index 0
 * 2. Guarantees at most one pricing block
 * 3. Deduplicates IDs across blocks
 */
export function normalizeCompositionBlocks(
  blocks: DocumentBlock[],
  options: {
    isInvoice?: boolean
    includePricingBlock?: boolean
    pricingTitle?: string
  } = {}
): DocumentBlock[] {
  const isInvoice = Boolean(options.isInvoice)
  const includePricing = options.includePricingBlock !== false
  const headerBinding = isInvoice ? "invoice.parties" : "proposal.parties"
  const pricingBinding = isInvoice ? "invoice.pricing" : "proposal.pricing"

  const seenIds = new Set<string>()
  const result: DocumentBlock[] = []

  let foundHeader: DocumentBlock | null = null
  let foundPricing: DocumentBlock | null = null

  for (const block of blocks) {
    if (block.type === "partyHeader") {
      if (!foundHeader) {
        foundHeader = {
          ...block,
          binding: headerBinding,
        }
      }
      continue
    }

    if (block.type === "pricing") {
      if (!foundPricing) {
        foundPricing = {
          ...block,
          binding: pricingBinding,
          config: {
            title: options.pricingTitle || block.config?.title || (isInvoice ? "Invoice Line Items" : "Services & Billing"),
          },
        }
      }
      continue
    }

    let blockId = block.id
    while (seenIds.has(blockId)) {
      blockId = `${block.type}-${Math.random().toString(36).slice(2, 9)}`
    }
    seenIds.add(blockId)

    result.push({
      ...block,
      id: blockId,
    })
  }

  // 1. Header always first
  if (foundHeader) {
    result.unshift(foundHeader)
  } else {
    result.unshift(
      buildPartyHeaderBlock({
        id: isInvoice ? "invoice-header" : "proposal-header",
        binding: headerBinding,
        layout: "editorial-band",
      })
    )
  }

  // 2. Pricing block positioning
  if (includePricing) {
    const pricingBlock =
      foundPricing ||
      buildPricingBlock({
        id: isInvoice ? "invoice-pricing" : "proposal-pricing",
        binding: pricingBinding,
        title: options.pricingTitle || (isInvoice ? "Invoice Line Items" : "Services & Billing"),
      })

    // If there is a signature or faq block, put pricing before them; otherwise append
    const signatureIdx = result.findIndex((b) => b.type === "signature")
    if (signatureIdx !== -1) {
      result.splice(signatureIdx, 0, pricingBlock)
    } else {
      result.push(pricingBlock)
    }
  }

  return result
}
