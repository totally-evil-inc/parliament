import { calculateProposalPricing } from "./calculate"
import { parseProposalDraft } from "./schema"
import type { DocumentBlock, PartySnapshot, ProposalDraft } from "./schema"

export type ProposalRenderModel = {
  id: string
  locale: string
  timezone: string
  template: ProposalDraft["template"]
  title: string
  issueDate: string
  validUntil?: string
  seller: PartySnapshot
  customer: PartySnapshot
  pricing?: ProposalDraft["data"]["pricing"] & {
    calculation: ReturnType<typeof calculateProposalPricing>
  }
  blocks: Array<DocumentBlock>
}

export function buildProposalRenderModel(input: unknown): ProposalRenderModel {
  const document = parseProposalDraft(input)
  const pricing = document.data.pricing

  return {
    id: document.id,
    locale: document.locale,
    timezone: document.timezone,
    template: document.template,
    title: document.data.title,
    issueDate: document.data.issueDate,
    validUntil: document.data.validUntil,
    seller: document.data.seller,
    customer: document.data.customer,
    pricing: pricing
      ? { ...pricing, calculation: calculateProposalPricing(pricing) }
      : undefined,
    blocks: document.composition.blocks,
  }
}
