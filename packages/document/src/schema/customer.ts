import { z } from "zod"

export const customerStatusEnumSchema = z.enum([
  "active",
  "lead",
  "inactive",
  "churned",
])

export type CustomerStatus = z.infer<typeof customerStatusEnumSchema>

export const customerSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    billingEmail: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    vatNumber: z.string().nullable().optional(),
    addressLine1: z.string().nullable().optional(),
    addressLine2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    status: customerStatusEnumSchema,
    preferredCurrency: z.string().regex(/^[A-Z]{3}$/),
    defaultPaymentTerms: z.number().int().positive(),
    logoUrl: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    employeeCount: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    isArchived: z.boolean(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
  })
  .strict()

export type Customer = z.infer<typeof customerSchema>

export const createCustomerInputSchema = z
  .object({
    name: z.string().trim().min(1),
    billingEmail: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().optional(),
    vatNumber: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    note: z.string().optional(),
    status: customerStatusEnumSchema.default("active"),
    preferredCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("USD"),
    defaultPaymentTerms: z.number().int().positive().default(30),
    industry: z.string().optional(),
  })
  .strict()

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>

export const updateCustomerInputSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    billingEmail: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().optional(),
    vatNumber: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    note: z.string().optional(),
    status: customerStatusEnumSchema.optional(),
    preferredCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    defaultPaymentTerms: z.number().int().positive().optional(),
    industry: z.string().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>

export const customerAnalyticsSchema = z
  .object({
    totalCustomersCount: z.number().int().nonnegative(),
    topRevenueClient: z
      .object({
        name: z.string(),
        revenueMinorUnits: z.number().int().nonnegative(),
      })
      .nullable(),
    mostActiveClient: z
      .object({
        name: z.string(),
        proposalsCount: z.number().int().nonnegative(),
      })
      .nullable(),
    inactiveClientsCount: z.number().int().nonnegative(),
    newCustomersThisMonth: z.number().int().nonnegative(),
  })
  .strict()

export type CustomerAnalytics = z.infer<typeof customerAnalyticsSchema>
