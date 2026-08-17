import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

export function withJsonSchema<T extends z.ZodTypeAny>(schema: T): T {
  if (schema && typeof schema === "object") {
    const std = (schema as any)["~standard"]
    if (std && typeof std === "object") {
      const getJsonSchema = (options?: unknown) => {
        if (typeof (schema as any).toJSONSchema === "function") {
          try {
            const res = (schema as any).toJSONSchema(options)
            if (res && typeof res === "object" && Object.keys(res).length > 1) {
              return res
            }
          } catch {
            // fallback if toJSONSchema throws on wrapped instance
          }
        }
        if (typeof (z as any).toJSONSchema === "function") {
          try {
            const res = (z as any).toJSONSchema(schema, options)
            if (res && typeof res === "object" && Object.keys(res).length > 1) {
              return res
            }
          } catch {
            // fallback
          }
        }
        try {
          const res = zodToJsonSchema(schema as any)
          if (res && typeof res === "object" && Object.keys(res).length > 1) {
            return res
          }
        } catch {
          // fallback
        }
        return { type: "object" }
      }
      std.jsonSchema = {
        input: getJsonSchema,
        output: getJsonSchema,
      }
    }
  }
  return schema
}

/**
 * Zod schemas for every agent tool (04-§2 in ideation/agent-chat).
 *
 * Single source of truth: the auth server turns these into TanStack AI
 * toolDefinitions and OpenUI ToolSpecs; the command app derives the
 * uiToolProvider fn-map keys and client types from the same registry.
 *
 * Conventions: money in integer minor units, dates as YYYY-MM-DD,
 * calendar events as ISO YYYY-MM-DDTHH:mm:ss + timeZone.
 */

// ——— Shared primitives ———

export const moneyMinorUnits = z.number().int().nonnegative()
export const currencyCode = z.string().length(3)
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
export const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/, "expected ISO date-time")
export const emailAddress = z.string().trim().email().max(320)

export const dealStage = z.enum([
  "lead",
  "discovery",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
])
export type DealStage = z.infer<typeof dealStage>

export const integrationProvider = z.enum([
  "gmail",
  "google-calendar",
  "google-drive",
  "linear",
  "notion",
])

export const toolError = z.object({
  error: z.object({
    code: z.enum([
      "not_found",
      "integration_not_connected",
      "validation",
      "scope_missing",
      "provider",
      "internal",
    ]),
    message: z.string(),
    provider: integrationProvider.optional(),
  }),
})
export type ToolError = z.infer<typeof toolError>

// ——— 2.1 Business reads (auto-run) ———

export const listDealsOutput = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      companyName: z.string().nullish(),
      contactEmail: emailAddress.nullish(),
      stage: dealStage,
      valueMinorUnits: moneyMinorUnits.nullish(),
      currency: currencyCode.nullish(),
      expectedCloseDate: dateOnly.nullish(),
    })
  ),
})

export const dealAnalyticsOutput = z.object({
  totalPipelineValue: moneyMinorUnits,
  closedWonValue: moneyMinorUnits,
  conversionRate: z.number(),
  avgDealSize: moneyMinorUnits,
  dealsToCloseThisMonth: z.number().int().nonnegative(),
  previousPipelineValue: moneyMinorUnits,
  previousConversionRate: z.number(),
  monthlyPipeline: z.array(
    z.object({
      monthKey: z.string(),
      month: z.string(),
      value: moneyMinorUnits,
      count: z.number().int().nonnegative(),
      isCurrent: z.boolean(),
    })
  ),
  stageBreakdown: z.array(
    z.object({
      stage: dealStage,
      count: z.number().int().nonnegative(),
      value: moneyMinorUnits,
    })
  ),
})

export const listCustomersOutput = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      billingEmail: emailAddress.nullish(),
      status: z.string().default("active"),
      proposalsCount: z.number().int().nonnegative(),
      totalRevenueMinorUnits: moneyMinorUnits,
      updatedAt: z.string().nullish(),
    })
  ),
})

export const customerAnalyticsOutput = z.object({
  totalCustomersCount: z.number().int().nonnegative(),
  topRevenueClient: z
    .object({
      name: z.string(),
      revenueMinorUnits: moneyMinorUnits,
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

export const customerRow = z.object({
  id: z.string().uuid(),
  name: z.string(),
  billingEmail: emailAddress.nullish(),
  phone: z.string().nullish(),
  website: z.string().nullish(),
  domain: z.string().nullish(),
  vatNumber: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  note: z.string().nullish(),
  status: z.string().default("active"),
  preferredCurrency: currencyCode.nullish(),
  industry: z.string().nullish(),
  isArchived: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const customerDealRow = z.object({
  id: z.string().uuid(),
  title: z.string(),
  stage: dealStage,
  valueMinorUnits: moneyMinorUnits.nullish(),
  currency: currencyCode.nullish(),
  expectedCloseDate: dateOnly.nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const customerProposalRow = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  totalMinorUnits: moneyMinorUnits.nullish(),
  currency: currencyCode.nullish(),
  createdAt: z.string(),
})

export const customerContactRow = z.object({
  id: z.string().uuid(),
  name: z.string().nullish(),
  email: emailAddress.nullish(),
  phone: z.string().nullish(),
  role: z.string().nullish(),
  createdAt: z.string(),
})

export const customerDetailsOutput = z.union([
  z.object({
    customer: customerRow,
    contacts: z.array(customerContactRow),
    deals: z.array(customerDealRow),
    proposals: z.array(customerProposalRow),
  }),
  toolError,
])

export const listProposalsOutput = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.string(),
      revision: z.number().int().nonnegative(),
      createdAt: z.string(),
      updatedAt: z.string(),
      viewCount: z.number().int().nonnegative(),
      lastViewedAt: z.string().nullable(),
      acceptedAt: z.string().nullable(),
      publicToken: z.string().nullable(),
      customerName: z.string(),
      issueDate: dateOnly,
      validUntil: z.string().nullable(),
      valueMinor: moneyMinorUnits,
      currency: currencyCode,
    })
  ),
})

export const listInvoicesOutput = z.object({
  rows: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.string(),
      revision: z.number().int().nonnegative(),
      createdAt: z.string(),
      updatedAt: z.string(),
      viewCount: z.number().int().nonnegative(),
      lastViewedAt: z.string().nullable(),
      publicToken: z.string().nullable(),
      customerName: z.string(),
      issueDate: dateOnly,
      dueDate: z.string(),
      valueMinor: moneyMinorUnits,
      currency: currencyCode,
      invoiceNumber: z.string(),
    })
  ),
})

export const getProposalSummaryOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    currency: currencyCode,
    subtotalMinorUnits: moneyMinorUnits,
    taxMinorUnits: moneyMinorUnits,
    totalMinorUnits: moneyMinorUnits,
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
    companyName: z.string(),
    contactEmail: emailAddress.nullish(),
    validUntil: dateOnly.nullish(),
  }),
  toolError,
])

export const getInvoiceSummaryOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    currency: currencyCode,
    totalMinor: moneyMinorUnits,
    issueDate: dateOnly,
    dueDate: z.string(),
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
  }),
  toolError,
])

export const calendarEvent = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string(),
  timeZone: z.string().nullish(),
  attendees: z.array(emailAddress).optional(),
  htmlLink: z.string().url().nullish(),
})

export const gcalListEventsOutput = z.union([
  z.object({
    events: z.array(calendarEvent),
  }),
  toolError,
])

export const verifyOrgAccessOutput = z.object({
  organizationId: z.string().uuid(),
  organizationName: z.string(),
})

export const integrationAccount = z.object({
  id: z.string(),
  providerId: integrationProvider,
  email: emailAddress.nullish(),
  name: z.string().nullish(),
  connectedAt: z.string().nullish(),
})

export const listIntegrationsOutput = z.object({
  accounts: z.array(integrationAccount),
})

// ——— 2.2 Mutating inputs ———

export const createDealInput = z.object({
  title: z.string().trim().min(1).max(200),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  stage: dealStage.optional(),
  valueMinorUnits: moneyMinorUnits.optional(),
  currency: currencyCode.optional(),
  expectedCloseDate: dateOnly.optional(),
})

export const updateDealStageInput = z.object({
  id: z.string().uuid(),
  stage: dealStage,
})

export const createCustomerInput = z.object({
  name: z.string().trim().min(1).max(200),
  billingEmail: emailAddress.optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  vatNumber: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  note: z.string().max(2000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  preferredCurrency: currencyCode.optional(),
  industry: z.string().max(100).optional(),
})

export const updateCustomerInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  billingEmail: emailAddress.optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  vatNumber: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  note: z.string().max(2000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  preferredCurrency: currencyCode.optional(),
  industry: z.string().max(100).optional(),
})

export const sendDocumentInput = z.object({
  documentId: z.string().uuid(),
  recipientEmail: emailAddress.optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  personalMessage: z.string().max(2000).optional(),
  includePdf: z.boolean().optional().default(false),
})

export const sendDocumentOutput = z.union([
  z.object({
    shareUrl: z.string().url(),
    status: z.literal("sent"),
    messageId: z.string().optional(),
    threadId: z.string().optional(),
    documentType: z.enum(["proposal", "invoice"]),
    documentTitle: z.string(),
    totalMinorUnits: moneyMinorUnits.optional(),
    currency: currencyCode.optional(),
    recipientEmail: emailAddress.optional(),
    includedPdf: z.boolean().optional(),
  }),
  toolError,
])

export const gmailSendInput = z.object({
  to: emailAddress,
  subject: z.string().trim().min(1).max(200),
  htmlText: z.string().min(1).max(100_000),
  plainText: z.string().max(100_000).optional(),
  replyTo: emailAddress.optional(),
})

export const gmailSendOutput = z.union([
  z.object({
    messageId: z.string(),
    threadId: z.string(),
  }),
  toolError,
])

export const gmailDraftInput = z.object({
  to: emailAddress,
  subject: z.string().trim().min(1).max(200),
  htmlText: z.string().min(1).max(100_000),
  plainText: z.string().max(100_000).optional(),
})

export const gmailDraftOutput = z.union([
  z.object({
    draftId: z.string(),
  }),
  toolError,
])

export const gcalCreateEventInput = z.object({
  summary: z.string().trim().min(1).max(200),
  start: isoDateTime,
  end: isoDateTime.optional(),
  description: z.string().max(5000).optional(),
  attendees: z.array(emailAddress).max(50).optional(),
  timeZone: z.string().max(100).optional(),
})

export const gcalCreateEventOutput = z.union([calendarEvent, toolError])

export const gcalCancelEventInput = z.object({
  eventId: z.string().min(1).max(500),
})

export const gcalCancelEventOutput = z.union([
  z.object({
    eventId: z.string(),
    cancelled: z.literal(true),
  }),
  toolError,
])

// ——— 2.3 Questionnaire / Clarification inputs & outputs ———

export const questionOptionSchema = z.union([
  z.string().describe("Option text label or value"),
  z.object({
    label: z.string().describe("User-facing label for the option"),
    value: z.string().describe("Underlying value or key"),
    description: z
      .string()
      .optional()
      .describe("Optional subtitle or explanation for this choice"),
  }),
])

export const questionItemSchema = z.object({
  id: z
    .string()
    .describe(
      "Unique identifier for this question (e.g. 'project_scope', 'budget', 'timeline')"
    ),
  question: z
    .string()
    .describe("The clarifying question text to display to the user"),
  type: z
    .enum(["single_choice", "multi_select", "text", "number"])
    .default("single_choice")
    .describe("Type of input control"),
  options: z
    .array(questionOptionSchema)
    .optional()
    .describe("List of selectable options for single_choice or multi_select"),
  placeholder: z
    .string()
    .optional()
    .describe("Placeholder text for text/number inputs"),
  defaultValue: z
    .union([z.string(), z.array(z.string()), z.number()])
    .optional()
    .describe("Default value"),
  required: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether answering this question is required"),
})

export const askClarifyingQuestionsInput = z.object({
  title: z
    .string()
    .describe(
      "Title of the questionnaire (e.g. 'Web Development Proposal Requirements')"
    ),
  subtitle: z
    .string()
    .optional()
    .describe("Brief explanation of why these details are needed"),
  questions: z
    .array(questionItemSchema)
    .min(1)
    .max(8)
    .describe("List of 1 to 8 clarifying questions with structured options"),
  submitButtonText: z
    .string()
    .optional()
    .default("Submit Answers")
    .describe("Text on the submit action button"),
})

export const askClarifyingQuestionsOutput = z.object({
  status: z.enum(["awaiting_user_input", "completed"]),
  message: z.string(),
  questionsCount: z.number(),
})

export type QuestionOption = {
  label: string
  value: string
  description?: string
}
export type QuestionItem = z.infer<typeof questionItemSchema>
export type AskClarifyingQuestionsInput = z.infer<
  typeof askClarifyingQuestionsInput
>
export type AskClarifyingQuestionsOutput = z.infer<
  typeof askClarifyingQuestionsOutput
>

// ——— 2.4 Declarative Document Authoring Schemas ———

export const declarativePricingItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  details: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).default("1"),
  unitPriceMinor: moneyMinorUnits,
  showDetails: z.boolean().optional().default(true),
  showImage: z.boolean().optional().default(false),
})

export const declarativeDiscountSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("rate"),
    basisPoints: z.number().int().min(0).max(1_000_000),
  }),
  z.object({
    kind: z.literal("fixed"),
    amountMinor: moneyMinorUnits,
  }),
])

export const declarativeTaxSchema = z.object({
  kind: z.literal("rate"),
  basisPoints: z.number().int().min(0).max(1_000_000),
})

export const declarativeBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("section"),
    id: z.string().optional(),
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    lead: z.string().optional(),
    variant: z
      .enum(["default", "accent", "compact"])
      .optional()
      .default("default"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("metrics"),
    id: z.string().optional(),
    columns: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .default(3),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          value: z.string().min(1),
          label: z.string().min(1),
          detail: z.string().optional(),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("timeline"),
    id: z.string().optional(),
    items: z
      .array(
        z.object({
          date: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("team"),
    id: z.string().optional(),
    columns: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .default(3),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          role: z.string().min(1),
          bio: z.string().optional(),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("testimonials"),
    id: z.string().optional(),
    columns: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional()
      .default(2),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          quote: z.string().min(1),
          author: z.string().min(1),
          role: z.string().optional(),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("faq"),
    id: z.string().optional(),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          question: z.string().min(1),
          answer: z.string().min(1),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("signature"),
    id: z.string().optional(),
    title: z.string().optional().default("Signatures & Acceptance"),
    terms: z.string().optional(),
  }),
  z.object({
    type: z.literal("columns"),
    id: z.string().optional(),
    title: z.string().optional(),
    columns: z
      .union([z.literal(2), z.literal(3)])
      .optional()
      .default(2),
    items: z
      .array(
        z.object({
          id: z.string().optional(),
          heading: z.string().min(1),
          body: z.string().min(1),
        })
      )
      .min(1),
  }),
  z.object({
    type: z.literal("cover"),
    id: z.string().optional(),
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    variant: z.enum(["split", "band", "minimal"]).optional().default("split"),
  }),
])

export const createProposalInput = z.object({
  title: z.string().trim().min(1).max(200),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: emailAddress.optional(),
  currency: currencyCode.optional().default("USD"),
  validDays: z.number().int().min(1).max(365).optional().default(14),
  items: z.array(declarativePricingItemSchema).optional().default([]),
  discount: declarativeDiscountSchema.optional(),
  tax: declarativeTaxSchema.optional(),
  blocks: z.array(declarativeBlockSchema).optional(),
})

export const createProposalOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    editorUrl: z.string(),
    totalMinorUnits: moneyMinorUnits,
    subtotalMinorUnits: moneyMinorUnits,
    taxMinorUnits: moneyMinorUnits,
    discountMinorUnits: moneyMinorUnits,
    currency: currencyCode,
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
    itemCount: z.number().int().nonnegative(),
    blockCount: z.number().int().nonnegative(),
  }),
  toolError,
])

export const createInvoiceInput = z.object({
  title: z.string().trim().min(1).max(200).optional().default("Invoice"),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerEmail: emailAddress.optional(),
  currency: currencyCode.optional().default("USD"),
  dueDays: z.number().int().min(0).max(365).optional().default(30),
  paymentTerms: z.string().optional(),
  items: z.array(declarativePricingItemSchema).min(1),
  discount: declarativeDiscountSchema.optional(),
  tax: declarativeTaxSchema.optional(),
  notes: z.string().optional(),
})

export const createInvoiceOutput = z.union([
  z.object({
    id: z.string().uuid(),
    invoiceNumber: z.string(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    editorUrl: z.string(),
    totalMinor: moneyMinorUnits,
    currency: currencyCode,
    issueDate: dateOnly,
    dueDate: dateOnly,
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
  }),
  toolError,
])

export const getProposalInput = z.object({
  id: z.string().uuid(),
})

export const getProposalOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    currency: currencyCode,
    subtotalMinorUnits: moneyMinorUnits,
    taxMinorUnits: moneyMinorUnits,
    discountMinorUnits: moneyMinorUnits,
    totalMinorUnits: moneyMinorUnits,
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
    companyName: z.string(),
    issueDate: dateOnly,
    validUntil: dateOnly.nullish(),
    editorUrl: z.string(),
    blocks: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string().optional(),
      })
    ),
    items: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        quantity: z.string(),
        unitPriceMinor: moneyMinorUnits,
      })
    ),
  }),
  toolError,
])

export const getInvoiceInput = z.object({
  id: z.string().uuid(),
})

export const getInvoiceOutput = z.union([
  z.object({
    id: z.string().uuid(),
    invoiceNumber: z.string(),
    title: z.string(),
    status: z.string(),
    revision: z.number().int().nonnegative(),
    currency: currencyCode,
    totalMinor: moneyMinorUnits,
    issueDate: dateOnly,
    dueDate: dateOnly,
    customerName: z.string(),
    customerEmail: emailAddress.nullish(),
    paymentTerms: z.string().nullish(),
    editorUrl: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        quantity: z.string(),
        unitPriceMinor: moneyMinorUnits,
      })
    ),
  }),
  toolError,
])

export const updateProposalInput = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  customerName: z.string().optional(),
  customerEmail: emailAddress.optional(),
  currency: currencyCode.optional(),
  validDays: z.number().int().min(1).max(365).optional(),
  items: z.array(declarativePricingItemSchema).optional(),
  discount: declarativeDiscountSchema.optional(),
  tax: declarativeTaxSchema.optional(),
  blocks: z.array(declarativeBlockSchema).optional(),
})

export const updateProposalOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    revision: z.number().int().nonnegative(),
    editorUrl: z.string(),
    totalMinorUnits: moneyMinorUnits,
    currency: currencyCode,
    status: z.string(),
  }),
  toolError,
])

export const updateInvoiceInput = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: dateOnly.optional(),
  dueDays: z.number().int().min(0).max(365).optional(),
  paymentTerms: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: emailAddress.optional(),
  items: z.array(declarativePricingItemSchema).optional(),
  discount: declarativeDiscountSchema.optional(),
  tax: declarativeTaxSchema.optional(),
  notes: z.string().optional(),
})

export const updateInvoiceOutput = z.union([
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    revision: z.number().int().nonnegative(),
    editorUrl: z.string(),
    totalMinor: moneyMinorUnits,
    currency: currencyCode,
    status: z.string(),
  }),
  toolError,
])

export const scheduleDocumentSendInput = z.object({
  documentType: z.enum(["proposal", "invoice"]),
  documentId: z.string().uuid(),
  recipientEmail: emailAddress,
  scheduledFor: isoDateTime,
  subject: z.string().trim().min(1).max(200).optional(),
  personalMessage: z.string().max(2000).optional(),
  includePdf: z.boolean().optional().default(false),
})

export const scheduleDocumentSendOutput = z.union([
  z.object({
    id: z.string().uuid(),
    documentType: z.enum(["proposal", "invoice"]),
    documentId: z.string().uuid(),
    recipientEmail: emailAddress,
    scheduledFor: z.string(),
    status: z.literal("pending"),
    subject: z.string(),
    includePdf: z.boolean().optional(),
  }),
  toolError,
])

export const listScheduledDispatchesInput = z.object({
  documentId: z.string().uuid().optional(),
  status: z
    .enum(["pending", "processing", "sent", "failed", "cancelled"])
    .optional(),
})

export const listScheduledDispatchesOutput = z.union([
  z.object({
    dispatches: z.array(
      z.object({
        id: z.string().uuid(),
        documentType: z.enum(["proposal", "invoice"]),
        documentId: z.string().uuid(),
        recipientEmail: emailAddress,
        scheduledFor: z.string(),
        status: z.string(),
        subject: z.string(),
        includePdf: z.boolean().optional(),
        createdAt: z.string(),
      })
    ),
  }),
  toolError,
])

export const cancelScheduledDispatchInput = z.object({
  id: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
})

export const cancelScheduledDispatchOutput = z.union([
  z.object({
    id: z.string().uuid(),
    status: z.literal("cancelled"),
    cancelledAt: z.string(),
  }),
  toolError,
])

export const customerDetailsInput = z.object({ id: z.string().uuid() })
export const getProposalSummaryInput = z.object({ id: z.string().uuid() })
export const getInvoiceSummaryInput = z.object({ id: z.string().uuid() })
export const getCurrentUserNameInput = z.object({}).strict()
export const getCurrentUserNameOutput = z
  .object({
    name: z.string(),
  })
  .strict()

export const toolInputSchemas = {
  get_current_user_name: getCurrentUserNameInput,
  list_deals: z.object({}),
  deal_analytics: z.object({}),
  list_customers: z.object({}),
  customer_analytics: z.object({}),
  customer_details: customerDetailsInput,
  list_proposals: z.object({}),
  list_invoices: z.object({}),
  get_proposal_summary: getProposalSummaryInput,
  get_invoice_summary: getInvoiceSummaryInput,
  get_proposal: getProposalInput,
  get_invoice: getInvoiceInput,
  create_proposal: createProposalInput,
  create_invoice: createInvoiceInput,
  update_proposal: updateProposalInput,
  update_invoice: updateInvoiceInput,
  schedule_document_send: scheduleDocumentSendInput,
  list_scheduled_dispatches: listScheduledDispatchesInput,
  cancel_scheduled_dispatch: cancelScheduledDispatchInput,
  gcal_list_events: z.object({
    days: z.number().int().min(1).max(14).optional(),
    calendarId: z.string().max(200).optional(),
  }),
  verify_org_access: z.object({}),
  list_integrations: z.object({}),
  create_deal: createDealInput,
  update_deal_stage: updateDealStageInput,
  create_customer: createCustomerInput,
  update_customer: updateCustomerInput,
  send_proposal: sendDocumentInput,
  send_invoice: sendDocumentInput,
  gmail_send_email: gmailSendInput,
  gmail_create_draft: gmailDraftInput,
  gcal_create_event: gcalCreateEventInput,
  gcal_cancel_event: gcalCancelEventInput,
  ask_clarifying_questions: askClarifyingQuestionsInput,
} as const

export const toolOutputSchemas = {
  get_current_user_name: getCurrentUserNameOutput,
  list_deals: listDealsOutput,
  deal_analytics: dealAnalyticsOutput,
  list_customers: listCustomersOutput,
  customer_analytics: customerAnalyticsOutput,
  customer_details: customerDetailsOutput,
  list_proposals: listProposalsOutput,
  list_invoices: listInvoicesOutput,
  get_proposal_summary: getProposalSummaryOutput,
  get_invoice_summary: getInvoiceSummaryOutput,
  get_proposal: getProposalOutput,
  get_invoice: getInvoiceOutput,
  create_proposal: createProposalOutput,
  create_invoice: createInvoiceOutput,
  update_proposal: updateProposalOutput,
  update_invoice: updateInvoiceOutput,
  schedule_document_send: scheduleDocumentSendOutput,
  list_scheduled_dispatches: listScheduledDispatchesOutput,
  cancel_scheduled_dispatch: cancelScheduledDispatchOutput,
  gcal_list_events: gcalListEventsOutput,
  verify_org_access: verifyOrgAccessOutput,
  list_integrations: listIntegrationsOutput,
  create_deal: z.object({ id: z.string().uuid() }),
  update_deal_stage: z.object({ id: z.string().uuid(), stage: dealStage }),
  create_customer: z.object({ id: z.string().uuid() }),
  update_customer: z.object({ id: z.string().uuid() }),
  send_proposal: sendDocumentOutput,
  send_invoice: sendDocumentOutput,
  gmail_send_email: gmailSendOutput,
  gmail_create_draft: gmailDraftOutput,
  gcal_create_event: gcalCreateEventOutput,
  gcal_cancel_event: gcalCancelEventOutput,
  ask_clarifying_questions: askClarifyingQuestionsOutput,
} as const
