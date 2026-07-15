import { calculateInvoicePricing, calculateProposalPricing } from "./calculate"
import type {
  DocumentBlock,
  InvoiceDraft,
  PartySnapshot,
  ProposalDraft,
} from "./schema"
import { parseInvoiceDraft, parseProposalDraft } from "./schema"

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

export type InvoiceRenderModel = {
  id: string
  locale: string
  timezone: string
  template: InvoiceDraft["template"]
  title: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  seller: PartySnapshot
  customer: PartySnapshot
  pricing?: InvoiceDraft["data"]["pricing"] & {
    calculation: ReturnType<typeof calculateInvoicePricing>
  }
  paymentTerms?: string
  blocks: Array<DocumentBlock>
}

export function buildInvoiceRenderModel(input: unknown): InvoiceRenderModel {
  const document = parseInvoiceDraft(input)
  const pricing = document.data.pricing

  return {
    id: document.id,
    locale: document.locale,
    timezone: document.timezone,
    template: document.template,
    title: document.data.title,
    invoiceNumber: document.data.invoiceNumber,
    issueDate: document.data.issueDate,
    dueDate: document.data.dueDate,
    seller: document.data.seller,
    customer: document.data.customer,
    pricing: pricing
      ? { ...pricing, calculation: calculateInvoicePricing(pricing) }
      : undefined,
    paymentTerms: document.data.paymentTerms,
    blocks: document.composition.blocks,
  }
}
