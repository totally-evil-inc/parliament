import { z } from "zod"

const idSchema = z.string().trim().min(1)
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")

export const richTextMarkSchema = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.unknown()).optional(),
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
      attrs: z.record(z.unknown()).optional(),
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
const blockBase = { id: idSchema, version: z.literal(1) } as const

export const documentBlockSchema = z.discriminatedUnion("type", [
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
      binding: z.literal("proposal.parties"),
      config: z.object({ layout: z.string().min(1) }).strict(),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("pricing"),
      binding: z.literal("proposal.pricing"),
      config: z.object({ title: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("metrics"),
      columns: columnsSchema,
      content: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("team"),
      columns: columnsSchema,
      content: richTextDocSchema,
    })
    .strict(),
  z
    .object({
      ...blockBase,
      type: z.literal("testimonials"),
      columns: columnsSchema,
      content: richTextDocSchema,
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
])

export type DocumentBlock = z.infer<typeof documentBlockSchema>

export const documentTemplateSchema = z
  .object({
    id: idSchema,
    version: z.number().int().positive(),
    overrides: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
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
        title: z.string(),
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
