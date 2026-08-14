import { z } from "zod"
import { stripHtml } from "./text"

const idSchema = z.string().trim().min(1)
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")

export const richTextMarkSchema = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type RichTextNode = {
  type: string
  attrs?: Record<string, unknown>
  marks?: Array<z.infer<typeof richTextMarkSchema>>
  text?: string
  content?: Array<RichTextNode>
}

export const richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      attrs: z.record(z.string(), z.unknown()).optional(),
      marks: z.array(richTextMarkSchema).optional(),
      text: z.string().optional(),
      content: z.array(richTextNodeSchema).optional(),
    })
    .strict()
)

export const richTextDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(richTextNodeSchema).default([]),
  })
  .strict()

export type RichTextDoc = z.infer<typeof richTextDocSchema>

function inlineRichTextDoc(value: string): RichTextDoc {
  return {
    type: "doc",
    content: value ? [{ type: "text", text: value }] : [],
  }
}

const inlineRichTextDocSchema = z.preprocess(
  (value) => (typeof value === "string" ? inlineRichTextDoc(value) : value),
  richTextDocSchema
)

export const sourceSnapshotSchema = z
  .object({
    sourceId: idSchema.optional(),
    sourceRevision: z.string().optional(),
  })
  .strict()

export const customFieldSchema = z
  .object({
    id: idSchema,
    label: z.string(),
    value: z.string(),
  })
  .strict()

export const partySchema = sourceSnapshotSchema
  .extend({
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
    website: z.string(),
    taxId: z.string(),
    customFields: z.array(customFieldSchema).default([]),
  })
  .strict()

export type PartySnapshot = z.infer<typeof partySchema>

export const pricingItemSchema = sourceSnapshotSchema
  .extend({
    id: idSchema,
    description: z.string(),
    details: z.string().default(""),
    quantity: z
      .string()
      .regex(/^\d+(?:\.\d+)?$/, "Expected a decimal quantity"),
    unitPriceMinor: z.number().int().nonnegative(),
    showDetails: z.boolean().default(false),
    showImage: z.boolean().default(false),
  })
  .strict()

export const rateAdjustmentSchema = z
  .object({
    kind: z.literal("rate"),
    basisPoints: z.number().int().min(0).max(1_000_000),
  })
  .strict()

export const fixedAdjustmentSchema = z
  .object({
    kind: z.literal("fixed"),
    amountMinor: z.number().int().nonnegative(),
  })
  .strict()

export const proposalPricingSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 currency"),
    items: z.array(pricingItemSchema),
    discount: z
      .discriminatedUnion("kind", [rateAdjustmentSchema, fixedAdjustmentSchema])
      .optional(),
    tax: rateAdjustmentSchema.optional(),
    notes: richTextDocSchema.optional(),
    signerName: z.string().default(""),
    signerTitle: z.string().default("Signature"),
  })
  .strict()

const columnsSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])
const narrativeColumnsSchema = z.union([z.literal(2), z.literal(3)])
const sectionVariantSchema = z.union([
  z.literal("default"),
  z.literal("accent"),
  z.literal("compact"),
])
const faqVariantSchema = z.literal("list")
const coverVariantSchema = z.union([
  z.literal("split"),
  z.literal("band"),
  z.literal("minimal"),
])
const imageCardsVariantSchema = z.union([
  z.literal("vertical"),
  z.literal("horizontal"),
])
const blockBase = { id: idSchema, version: z.literal(1) } as const
const blockAssetReferenceSchema = z
  .object({
    assetId: idSchema,
    alt: z.string(),
  })
  .strict()
const richTextItemSchema = z
  .object({
    id: idSchema,
    heading: inlineRichTextDocSchema,
    body: richTextDocSchema,
  })
  .strict()
const metricItemSchema = z
  .object({
    id: idSchema,
    value: inlineRichTextDocSchema,
    label: inlineRichTextDocSchema,
    detail: richTextDocSchema,
  })
  .strict()
const teamMemberItemSchema = z
  .object({
    id: idSchema,
    sourceId: idSchema.optional(),
    name: inlineRichTextDocSchema,
    role: inlineRichTextDocSchema,
    bio: richTextDocSchema,
  })
  .strict()
const testimonialItemSchema = z
  .object({
    id: idSchema,
    sourceId: idSchema.optional(),
    quote: richTextDocSchema,
    author: inlineRichTextDocSchema,
    role: inlineRichTextDocSchema,
  })
  .strict()
const imageCardItemSchema = z
  .object({
    id: idSchema,
    image: blockAssetReferenceSchema.optional(),
    title: inlineRichTextDocSchema,
    body: richTextDocSchema,
  })
  .strict()

export const documentBlockSchema = z.union([
  z
    .object({
      ...blockBase,
      type: z.literal("richText"),
      content: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("partyHeader"),
      binding: z.union([
        z.literal("proposal.parties"),
        z.literal("invoice.parties"),
      ]),
      config: z.object({ layout: z.string().min(1) }).strict(),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("pricing"),
      binding: z.union([
        z.literal("proposal.pricing"),
        z.literal("invoice.pricing"),
      ]),
      config: z.object({ title: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("section"),
      eyebrow: inlineRichTextDocSchema.default({ type: "doc", content: [] }),
      title: inlineRichTextDocSchema,
      lead: inlineRichTextDocSchema.default({ type: "doc", content: [] }),
      variant: sectionVariantSchema.default("default"),
      content: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("cover"),
      eyebrow: inlineRichTextDocSchema.default({ type: "doc", content: [] }),
      title: inlineRichTextDocSchema,
      subtitle: inlineRichTextDocSchema.default({ type: "doc", content: [] }),
      media: blockAssetReferenceSchema.optional(),
      variant: coverVariantSchema.default("split"),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("columns"),
      columns: narrativeColumnsSchema,
      title: inlineRichTextDocSchema,
      items: z.array(richTextItemSchema),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("imageText"),
      image: blockAssetReferenceSchema.optional(),
      eyebrow: inlineRichTextDocSchema.default({ type: "doc", content: [] }),
      title: inlineRichTextDocSchema,
      content: richTextDocSchema,
      reverse: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("imageCards"),
      columns: columnsSchema,
      variant: imageCardsVariantSchema.default("vertical"),
      items: z.array(imageCardItemSchema),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("signature"),
      binding: z.literal("proposal.pricing.signer"),
      title: inlineRichTextDocSchema,
      terms: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("metrics"),
      columns: columnsSchema,
      items: z.array(metricItemSchema),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("team"),
      columns: columnsSchema,
      items: z.array(teamMemberItemSchema),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("testimonials"),
      columns: columnsSchema,
      items: z.array(testimonialItemSchema),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("gallery"),
      columns: columnsSchema,
      images: z.array(
        z
          .object({
            id: idSchema,
            assetId: idSchema.optional(),
            alt: z.string(),
          })
          .strict()
      ),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("timeline"),
      content: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("faq"),
      variant: faqVariantSchema.default("list"),
      items: z.array(
        z
          .object({
            id: idSchema,
            question: inlineRichTextDocSchema,
            answer: richTextDocSchema,
          })
          .strict()
      ),
    })
    .strict(),
])

export type DocumentBlock = z.infer<typeof documentBlockSchema>

export const documentTemplateSchema = z
  .object({
    id: idSchema,
    version: z.number().int().positive(),
    overrides: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()])
      )
      .optional(),
  })
  .strict()

export const documentAssetSchema = z
  .object({
    id: idSchema,
    kind: z.enum(["logo", "image", "signature", "qr"]),
    storageKey: z.string().min(1),
    mimeType: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    sha256: z.string().optional(),
  })
  .strict()

const cleanTitleSchema = z.preprocess(
  (val) => (typeof val === "string" ? stripHtml(val) : val),
  z.string()
)

export const proposalDraftSchema = z
  .object({
    id: idSchema,
    kind: z.literal("proposal"),
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    status: z.literal("draft"),
    locale: z.string().min(2),
    timezone: z.string().min(1),
    template: documentTemplateSchema,
    data: z
      .object({
        title: cleanTitleSchema,
        issueDate: dateOnlySchema,
        validUntil: dateOnlySchema.optional(),
        seller: partySchema,
        customer: partySchema,
        pricing: proposalPricingSchema.optional(),
      })
      .strict(),
    composition: z
      .object({ version: z.literal(1), blocks: z.array(documentBlockSchema) })
      .strict(),
    assets: z.array(documentAssetSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()

export type ProposalDraft = z.infer<typeof proposalDraftSchema>

export function parseProposalDraft(input: unknown): ProposalDraft {
  return proposalDraftSchema.parse(input)
}

export function safeParseProposalDraft(input: unknown) {
  return proposalDraftSchema.safeParse(input)
}

export const invoicePricingSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 currency"),
    items: z.array(pricingItemSchema),
    discount: z
      .discriminatedUnion("kind", [rateAdjustmentSchema, fixedAdjustmentSchema])
      .optional(),
    tax: rateAdjustmentSchema.optional(),
    notes: richTextDocSchema.optional(),
  })
  .strict()

export const invoiceDraftSchema = z
  .object({
    id: idSchema,
    kind: z.literal("invoice"),
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    status: z.literal("draft"),
    locale: z.string().min(2),
    timezone: z.string().min(1),
    template: documentTemplateSchema,
    data: z
      .object({
        title: cleanTitleSchema,
        invoiceNumber: z.string(),
        issueDate: dateOnlySchema,
        dueDate: dateOnlySchema,
        seller: partySchema,
        customer: partySchema,
        pricing: invoicePricingSchema.optional(),
        paymentTerms: z.string().optional(),
      })
      .strict(),
    composition: z
      .object({ version: z.literal(1), blocks: z.array(documentBlockSchema) })
      .strict(),
    assets: z.array(documentAssetSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>

export function parseInvoiceDraft(input: unknown): InvoiceDraft {
  return invoiceDraftSchema.parse(input)
}

export function safeParseInvoiceDraft(input: unknown) {
  return invoiceDraftSchema.safeParse(input)
}

export const proposalStatusEnumSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "archived",
])

export const proposalPersistedSchema = z
  .object({
    id: idSchema,
    organizationId: idSchema,
    companyId: idSchema.nullable().optional(),
    contactId: idSchema.nullable().optional(),
    title: z.string().min(1),
    status: proposalStatusEnumSchema,
    currency: z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 currency"),
    subtotalMinorUnits: z.number().int(),
    taxMinorUnits: z.number().int(),
    totalMinorUnits: z.number().int(),
    portalToken: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdById: idSchema.nullable().optional(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
  })
  .strict()

export type ProposalPersisted = z.infer<typeof proposalPersistedSchema>

export const proposalVersionSchema = z
  .object({
    id: idSchema,
    proposalId: idSchema,
    organizationId: idSchema,
    versionNumber: z.number().int().positive(),
    content: z.array(documentBlockSchema),
    proposalDraft: proposalDraftSchema,
    hash: z.string().min(1),
    createdById: idSchema.nullable().optional(),
    createdAt: z.string().or(z.date()),
  })
  .strict()

export type ProposalVersion = z.infer<typeof proposalVersionSchema>

export const createProposalInputSchema = z
  .object({
    title: z.string().min(1),
    companyId: idSchema.optional(),
    contactId: idSchema.optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("USD"),
    draft: proposalDraftSchema.optional(),
  })
  .strict()

export type CreateProposalInput = z.infer<typeof createProposalInputSchema>

export * from "./schema/customer"
export * from "./schema/deal"
