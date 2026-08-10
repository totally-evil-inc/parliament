import { z } from "zod"

export const dealStageEnumSchema = z.enum([
  "lead",
  "discovery",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
])

export type DealStage = z.infer<typeof dealStageEnumSchema>

export const dealSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    companyId: z.string().trim().min(1).nullable().optional(),
    contactId: z.string().trim().min(1).nullable().optional(),
    proposalId: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().min(1),
    stage: dealStageEnumSchema,
    valueMinorUnits: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/, "Expected an ISO 4217 currency"),
    expectedCloseDate: z.string().nullable().optional(),
    createdById: z.string().trim().min(1).nullable().optional(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
  })
  .strict()

export type Deal = z.infer<typeof dealSchema>

export const createDealInputSchema = z
  .object({
    title: z.string().trim().min(1),
    companyId: z.string().trim().min(1).optional(),
    contactId: z.string().trim().min(1).optional(),
    stage: dealStageEnumSchema.default("lead"),
    valueMinorUnits: z.number().int().nonnegative().default(0),
    currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
    expectedCloseDate: z.string().optional(),
  })
  .strict()

export type CreateDealInput = z.infer<typeof createDealInputSchema>

export const updateDealStageInputSchema = z
  .object({
    id: z.string().trim().min(1),
    stage: dealStageEnumSchema,
  })
  .strict()

export type UpdateDealStageInput = z.infer<typeof updateDealStageInputSchema>
