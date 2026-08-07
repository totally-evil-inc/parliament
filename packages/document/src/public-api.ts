import { z } from "zod"
import { invoiceDraftSchema, proposalDraftSchema } from "./schema"

export const proposalAcceptanceRecordSchema = z.object({
  id: z.string(),
  proposalSnapshotId: z.string(),
  publicLinkId: z.string(),
  signerName: z.string(),
  signerEmail: z.string(),
  signatureText: z.string().nullable(),
  signatureImage: z.string().nullable(),
  otpVerified: z.boolean(),
  agreedTerms: z.boolean(),
  acceptedAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
})

export type ProposalAcceptanceRecord = z.infer<
  typeof proposalAcceptanceRecordSchema
>

export const invoiceAcceptanceRecordSchema = z.object({
  id: z.string(),
  invoiceSnapshotId: z.string(),
  publicLinkId: z.string(),
  signerName: z.string(),
  signerEmail: z.string(),
  signatureText: z.string().nullable(),
  signatureImage: z.string().nullable(),
  otpVerified: z.boolean(),
  agreedTerms: z.boolean(),
  acceptedAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
})

export type InvoiceAcceptanceRecord = z.infer<
  typeof invoiceAcceptanceRecordSchema
>

export const getPublicProposalMetaResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("not_found") }),
    z.object({
      status: z.literal("unavailable"),
      reason: z.enum(["revoked", "expired"]),
    }),
    z.object({
      status: z.literal("ready"),
      token: z.string(),
      title: z.string(),
      sellerName: z.string(),
      recipientEmail: z.string().nullable(),
    }),
  ]
)

export type GetPublicProposalMetaResult = z.infer<
  typeof getPublicProposalMetaResultSchema
>

export const getPublicProposalResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_found") }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["revoked", "expired"]),
  }),
  z.object({
    status: z.literal("forbidden"),
    error: z.string(),
  }),
  z.object({
    status: z.literal("ready"),
    linkId: z.string(),
    token: z.string(),
    snapshotId: z.string(),
    document: proposalDraftSchema,
    accepted: proposalAcceptanceRecordSchema.nullable(),
  }),
])

export type GetPublicProposalResult = z.infer<
  typeof getPublicProposalResultSchema
>

export const getPublicInvoiceMetaResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_found") }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["revoked", "expired"]),
  }),
  z.object({
    status: z.literal("ready"),
    token: z.string(),
    number: z.string(),
    sellerName: z.string(),
    recipientEmail: z.string().nullable(),
  }),
])

export type GetPublicInvoiceMetaResult = z.infer<
  typeof getPublicInvoiceMetaResultSchema
>

export const getPublicInvoiceResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_found") }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["revoked", "expired"]),
  }),
  z.object({
    status: z.literal("forbidden"),
    error: z.string(),
  }),
  z.object({
    status: z.literal("ready"),
    linkId: z.string(),
    token: z.string(),
    snapshotId: z.string(),
    document: invoiceDraftSchema,
    paymentLinkUrl: z.string().nullable(),
    accepted: invoiceAcceptanceRecordSchema.nullable(),
  }),
])

export type GetPublicInvoiceResult = z.infer<
  typeof getPublicInvoiceResultSchema
>

export const acceptDocumentBodySchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().min(1),
  signatureText: z.string().optional(),
  signatureImage: z.string().optional(),
  otpVerified: z.boolean().optional(),
  agreedTerms: z.literal(true),
})

export type AcceptancePayload = z.infer<typeof acceptDocumentBodySchema>

export const acceptanceResponseSchema = z.object({
  success: z.boolean(),
  accepted: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
})

export type AcceptanceResponse<T> = {
  success: boolean
  accepted?: T
  error?: string
}

export const clientEventBodySchema = z.object({
  documentType: z.enum(["proposal", "invoice"]),
  token: z.string().min(1),
  eventType: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ClientEventPayload = z.infer<typeof clientEventBodySchema>

export const clientEventResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    eventId: z.string(),
  }),
  z.object({
    success: z.literal(false),
    reason: z.enum(["not_found", "invalid_payload"]).optional(),
    error: z.string().optional(),
  }),
])

export type ClientEventResponse = z.infer<typeof clientEventResponseSchema>
