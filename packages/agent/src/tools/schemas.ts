import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import { UUID_REGEX, isUuid } from "../utils/uuid"

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

function normalizeIsoDateTime(val: unknown): string {
  if (typeof val !== "string") return new Date().toISOString()
  const trimmed = val.trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) {
    return trimmed.replace(" ", "T")
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00:00`
  }
  try {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString()
    }
  } catch {
    // retain
  }
  return trimmed
}

// ——— 2.2 Mutating inputs ———

const createDealBaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  stage: dealStage.optional(),
  valueMinorUnits: moneyMinorUnits.optional(),
  currency: currencyCode.optional(),
  expectedCloseDate: dateOnly.optional(),
})

export const createDealInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const title = String(
      inner.title ||
        inner.name ||
        inner.dealName ||
        inner.dealTitle ||
        "New Deal"
    )
    const companyId = inner.companyId || inner.customerId || inner.company
    const contactId = inner.contactId || inner.contact
    let stage = inner.stage
      ? String(inner.stage)
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_")
      : "lead"
    if (stage === "won" || stage === "closedwon") stage = "closed_won"
    if (stage === "lost" || stage === "closedlost") stage = "closed_lost"
    if (stage === "proposalsent") stage = "proposal_sent"

    const rawVal =
      inner.valueMinorUnits ?? inner.value ?? inner.amount ?? inner.price ?? 0
    let valueMinorUnits = Math.round(Number(rawVal) || 0)
    if (valueMinorUnits < 0) valueMinorUnits = 0

    const currency = String(inner.currency || "USD")
      .toUpperCase()
      .slice(0, 3)
    let expectedCloseDate =
      inner.expectedCloseDate || inner.closeDate || inner.date
    if (typeof expectedCloseDate === "string") {
      expectedCloseDate = expectedCloseDate.split("T")[0]
    }

    return {
      ...inner,
      title,
      companyId: isUuid(companyId) ? companyId.trim() : undefined,
      contactId: isUuid(contactId) ? contactId.trim() : undefined,
      stage,
      valueMinorUnits,
      currency,
      expectedCloseDate:
        typeof expectedCloseDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(expectedCloseDate)
          ? expectedCloseDate
          : undefined,
    }
  }
  return target
}, createDealBaseSchema) as unknown as typeof createDealBaseSchema

const updateDealStageBaseSchema = z.object({
  id: z.string().min(1),
  stage: dealStage,
})

export const updateDealStageInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(inner.id || inner.dealId || inner.deal_id || "").trim()
    let stage = inner.stage
      ? String(inner.stage)
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_")
      : "lead"
    if (stage === "won" || stage === "closedwon") stage = "closed_won"
    if (stage === "lost" || stage === "closedlost") stage = "closed_lost"
    if (stage === "proposalsent") stage = "proposal_sent"
    return {
      ...inner,
      id,
      stage,
    }
  }
  return target
}, updateDealStageBaseSchema) as unknown as typeof updateDealStageBaseSchema

const createCustomerBaseSchema = z.object({
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

export const createCustomerInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const name = String(
      inner.name ||
        inner.companyName ||
        inner.customerName ||
        inner.title ||
        "New Customer"
    )
    const billingEmail = inner.billingEmail || inner.email || inner.contactEmail
    const phone = inner.phone || inner.phoneNumber
    const website = inner.website || inner.domain || inner.url
    const note = inner.note || inner.notes || inner.description
    let status = inner.status ? String(inner.status).toLowerCase() : "active"
    if (status !== "active" && status !== "inactive") status = "active"
    const preferredCurrency = String(
      inner.preferredCurrency || inner.currency || "USD"
    )
      .toUpperCase()
      .slice(0, 3)

    return {
      ...inner,
      name,
      billingEmail:
        typeof billingEmail === "string" && billingEmail.includes("@")
          ? billingEmail.trim()
          : undefined,
      phone: phone ? String(phone) : undefined,
      website: website ? String(website) : undefined,
      note: note ? String(note) : undefined,
      status,
      preferredCurrency,
    }
  }
  return target
}, createCustomerBaseSchema) as unknown as typeof createCustomerBaseSchema

const updateCustomerBaseSchema = z.object({
  id: z.string().min(1),
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

export const updateCustomerInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id || inner.customerId || inner.companyId || ""
    ).trim()
    const name = inner.name || inner.companyName || inner.customerName
    const billingEmail = inner.billingEmail || inner.email
    const phone = inner.phone || inner.phoneNumber
    const website = inner.website || inner.domain
    const note = inner.note || inner.notes
    let status = inner.status ? String(inner.status).toLowerCase() : undefined
    if (status && status !== "active" && status !== "inactive")
      status = "active"

    return {
      ...inner,
      id,
      name: name ? String(name) : undefined,
      billingEmail:
        typeof billingEmail === "string" && billingEmail.includes("@")
          ? billingEmail.trim()
          : undefined,
      phone: phone ? String(phone) : undefined,
      website: website ? String(website) : undefined,
      note: note ? String(note) : undefined,
      status,
    }
  }
  return target
}, updateCustomerBaseSchema) as unknown as typeof updateCustomerBaseSchema

const sendDocumentBaseSchema = z.object({
  documentId: z.string().min(1),
  recipientEmail: emailAddress.optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  personalMessage: z.string().max(2000).optional(),
  includePdf: z.boolean().optional().default(false),
})

export const sendDocumentInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const documentId = String(
      inner.documentId ||
        inner.id ||
        inner.proposalId ||
        inner.invoiceId ||
        inner.draftId ||
        ""
    ).trim()
    const recipientEmail =
      inner.recipientEmail || inner.to || inner.email || inner.customerEmail
    const subject = inner.subject || inner.title
    const personalMessage =
      inner.personalMessage || inner.message || inner.body || inner.note
    const includePdf = Boolean(inner.includePdf ?? inner.pdf ?? inner.attachPdf)

    return {
      ...inner,
      documentId,
      recipientEmail:
        typeof recipientEmail === "string" && recipientEmail.includes("@")
          ? recipientEmail.trim()
          : undefined,
      subject: subject ? String(subject) : undefined,
      personalMessage: personalMessage ? String(personalMessage) : undefined,
      includePdf,
    }
  }
  return target
}, sendDocumentBaseSchema) as unknown as typeof sendDocumentBaseSchema

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

const gmailSendBaseSchema = z.object({
  to: emailAddress,
  subject: z.string().trim().min(1).max(200),
  htmlText: z.string().min(1).max(100_000),
  plainText: z.string().max(100_000).optional(),
  replyTo: emailAddress.optional(),
})

export const gmailSendInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const to = String(
      inner.to || inner.recipient || inner.recipientEmail || inner.email || ""
    ).trim()
    const subject = String(inner.subject || inner.title || "No Subject").trim()
    let htmlText = String(
      inner.htmlText ||
        inner.body ||
        inner.message ||
        inner.content ||
        inner.text ||
        ""
    ).trim()
    if (!htmlText) htmlText = "<p></p>"
    const plainText = inner.plainText ? String(inner.plainText) : undefined
    const replyTo = inner.replyTo ? String(inner.replyTo) : undefined

    return {
      ...inner,
      to,
      subject,
      htmlText,
      plainText,
      replyTo,
    }
  }
  return target
}, gmailSendBaseSchema) as unknown as typeof gmailSendBaseSchema

export const gmailSendOutput = z.union([
  z.object({
    messageId: z.string(),
    threadId: z.string(),
  }),
  toolError,
])

const gmailDraftBaseSchema = z.object({
  to: emailAddress,
  subject: z.string().trim().min(1).max(200),
  htmlText: z.string().min(1).max(100_000),
  plainText: z.string().max(100_000).optional(),
})

export const gmailDraftInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const to = String(
      inner.to || inner.recipient || inner.recipientEmail || inner.email || ""
    ).trim()
    const subject = String(inner.subject || inner.title || "No Subject").trim()
    let htmlText = String(
      inner.htmlText ||
        inner.body ||
        inner.message ||
        inner.content ||
        inner.text ||
        ""
    ).trim()
    if (!htmlText) htmlText = "<p></p>"
    const plainText = inner.plainText ? String(inner.plainText) : undefined

    return {
      ...inner,
      to,
      subject,
      htmlText,
      plainText,
    }
  }
  return target
}, gmailDraftBaseSchema) as unknown as typeof gmailDraftBaseSchema

export const gmailDraftOutput = z.union([
  z.object({
    draftId: z.string(),
  }),
  toolError,
])

const gcalCreateEventBaseSchema = z.object({
  summary: z.string().trim().min(1).max(200),
  start: z.string(),
  end: z.string().optional(),
  description: z.string().max(5000).optional(),
  attendees: z.array(emailAddress).max(50).optional(),
  timeZone: z.string().max(100).optional(),
})

export const gcalCreateEventInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const summary = String(
      inner.summary || inner.title || inner.name || inner.event || "Meeting"
    ).trim()
    const start = normalizeIsoDateTime(
      inner.start || inner.startTime || inner.startDate || inner.date
    )
    const rawEnd = inner.end || inner.endTime || inner.endDate
    const end = rawEnd ? normalizeIsoDateTime(rawEnd) : undefined
    const description =
      inner.description || inner.details || inner.notes
        ? String(inner.description || inner.details || inner.notes)
        : undefined
    let attendees: string[] | undefined
    const rawAttendees = inner.attendees || inner.participants || inner.guests
    if (Array.isArray(rawAttendees)) {
      attendees = rawAttendees
        .map((a) => String(a).trim())
        .filter((a) => a.includes("@"))
    } else if (typeof rawAttendees === "string" && rawAttendees.includes("@")) {
      attendees = [rawAttendees.trim()]
    }

    return {
      ...inner,
      summary,
      start,
      end,
      description,
      attendees,
      timeZone: inner.timeZone ? String(inner.timeZone) : undefined,
    }
  }
  return target
}, gcalCreateEventBaseSchema) as unknown as typeof gcalCreateEventBaseSchema

export const gcalCreateEventOutput = z.union([calendarEvent, toolError])

const gcalCancelEventBaseSchema = z.object({
  eventId: z.string().min(1).max(500),
})

export const gcalCancelEventInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { eventId: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const eventId = String(
      inner.eventId || inner.id || inner.event || ""
    ).trim()
    return { ...inner, eventId }
  }
  return target
}, gcalCancelEventBaseSchema) as unknown as typeof gcalCancelEventBaseSchema

export const gcalCancelEventOutput = z.union([
  z.object({
    eventId: z.string(),
    cancelled: z.literal(true),
  }),
  toolError,
])

// ——— 2.3 Questionnaire / Clarification inputs & outputs ———

export const questionOptionSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return { label: val, value: val }
    }
    if (typeof val === "number") {
      return { label: String(val), value: String(val) }
    }
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>
      const label = String(
        obj.label ?? obj.title ?? obj.text ?? obj.name ?? obj.value ?? ""
      )
      const value = String(
        obj.value ?? obj.key ?? obj.id ?? obj.label ?? obj.title ?? label
      )
      const description = obj.description ? String(obj.description) : undefined
      return { label, value, description }
    }
    return val
  },
  z.object({
    label: z.string().describe("User-facing label for the option"),
    value: z.string().describe("Underlying value or key"),
    description: z
      .string()
      .optional()
      .describe("Optional subtitle or explanation for this choice"),
  })
)

export const questionItemSchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>
      const id = String(
        obj.id ||
          obj.name ||
          obj.key ||
          `q_${Math.random().toString(36).slice(2, 9)}`
      )
      const question = String(
        obj.question ||
          obj.prompt ||
          obj.title ||
          obj.label ||
          obj.text ||
          "Clarifying question"
      )
      let type = obj.type
      if (typeof type === "string") {
        const lower = type.toLowerCase()
        if (
          lower.includes("multi_select") ||
          lower.includes("multiselect") ||
          lower.includes("check")
        ) {
          type = "multi_select"
        } else if (
          lower.includes("text") ||
          lower.includes("str") ||
          lower.includes("input") ||
          lower.includes("area")
        ) {
          type = "text"
        } else if (
          lower.includes("num") ||
          lower.includes("int") ||
          lower.includes("count") ||
          lower.includes("amount") ||
          lower.includes("price")
        ) {
          type = "number"
        } else if (
          lower.includes("single") ||
          lower.includes("choice") ||
          lower.includes("radio") ||
          lower.includes("select") ||
          lower.includes("option")
        ) {
          type = "single_choice"
        } else {
          type = "single_choice"
        }
      } else {
        type = "single_choice"
      }

      let rawOptionsCandidate =
        obj.options ?? obj.choices ?? obj.items ?? obj.values
      if (typeof rawOptionsCandidate === "string") {
        try {
          rawOptionsCandidate = JSON.parse(rawOptionsCandidate)
        } catch {
          // keep as is
        }
      }
      const rawOptions = Array.isArray(rawOptionsCandidate)
        ? rawOptionsCandidate
        : undefined

      return {
        ...obj,
        id,
        question,
        type,
        options: rawOptions,
        required: obj.required !== false,
      }
    }
    return val
  },
  z.object({
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
)

export const askClarifyingQuestionsInput = z.preprocess(
  (val) => {
    let target = val
    if (typeof target === "string") {
      try {
        target = JSON.parse(target)
      } catch {
        // keep as is
      }
    }
    if (target && typeof target === "object") {
      const obj = target as Record<string, unknown>
      const inner = (obj.parameters ||
        obj.input ||
        obj.args ||
        obj.data ||
        obj) as Record<string, unknown>
      const title = String(
        inner.title || inner.heading || inner.topic || "Clarifying Questions"
      )
      const subtitle = inner.subtitle ? String(inner.subtitle) : undefined

      let rawQuestionsCandidate =
        inner.questions ?? inner.items ?? inner.inquiries ?? inner.fields
      if (typeof rawQuestionsCandidate === "string") {
        try {
          rawQuestionsCandidate = JSON.parse(rawQuestionsCandidate)
        } catch {
          // keep as is
        }
      }
      const rawQuestions = Array.isArray(rawQuestionsCandidate)
        ? rawQuestionsCandidate
        : []
      return {
        ...inner,
        title,
        subtitle,
        questions: rawQuestions,
        submitButtonText: inner.submitButtonText
          ? String(inner.submitButtonText)
          : "Submit Answers",
      }
    }
    return target
  },
  z.object({
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
)

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

const declarativePricingItemBaseSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  details: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).default("1"),
  unitPriceMinor: moneyMinorUnits,
  showDetails: z.boolean().optional().default(true),
  showImage: z.boolean().optional().default(false),
})

export const declarativePricingItemSchema = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const description = String(
      obj.description || obj.name || obj.title || obj.item || "Line Item"
    )
    const quantity = obj.quantity !== undefined ? String(obj.quantity) : "1"
    let unitPriceMinor =
      obj.unitPriceMinor ??
      obj.priceMinor ??
      obj.unit_price_minor ??
      obj.amountMinor
    if (unitPriceMinor === undefined) {
      const rawPrice =
        obj.unitPrice ??
        obj.price ??
        obj.unit_price ??
        obj.amount ??
        obj.rate ??
        0
      const num = Number(rawPrice)
      unitPriceMinor = !Number.isNaN(num) ? Math.round(num) : 0
    } else {
      unitPriceMinor = Math.round(Number(unitPriceMinor) || 0)
    }
    return {
      ...obj,
      description,
      quantity,
      unitPriceMinor,
      details: obj.details ? String(obj.details) : undefined,
      showDetails: obj.showDetails !== false,
      showImage: obj.showImage === true,
    }
  }
  return val
}, declarativePricingItemBaseSchema) as unknown as typeof declarativePricingItemBaseSchema

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

const declarativeBlockBaseSchema = z.discriminatedUnion("type", [
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

export const declarativeBlockSchema = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const type = String(obj.type || "section").toLowerCase()
    // If data is nested under obj.data, merge it up
    const data =
      obj.data && typeof obj.data === "object"
        ? (obj.data as Record<string, unknown>)
        : {}
    const merged: Record<string, unknown> = {
      ...data,
      ...obj,
      type,
    }
    delete merged.data

    // Unpack stringified JSON sub-arrays if any
    for (const k of [
      "items",
      "metrics",
      "milestones",
      "members",
      "columns",
      "rows",
      "cards",
      "quotes",
      "faqs",
    ]) {
      if (typeof merged[k] === "string") {
        try {
          merged[k] = JSON.parse(merged[k] as string)
        } catch {
          // retain
        }
      }
    }

    // Map alias array keys to items
    if (type === "metrics" && !merged.items) {
      merged.items = merged.metrics || merged.stats
    } else if (type === "timeline" && !merged.items) {
      merged.items = merged.milestones || merged.events || merged.steps
    } else if (type === "team" && !merged.items) {
      merged.items = merged.members || merged.people || merged.staff
    } else if (type === "testimonials" && !merged.items) {
      merged.items = merged.quotes || merged.reviews
    } else if (type === "faq" && !merged.items) {
      merged.items = merged.questions || merged.faqs
    } else if (type === "columns" && !merged.items) {
      merged.items =
        merged.cols ||
        (Array.isArray(merged.columns) ? merged.columns : undefined)
      if (Array.isArray(merged.columns)) {
        merged.columns = merged.columns.length === 3 ? 3 : 2
      }
    }

    // If items is an array, map inner fields
    if (Array.isArray(merged.items)) {
      if (type === "columns") {
        merged.items = merged.items.map((item: any) => {
          if (typeof item === "string") return { heading: "Item", body: item }
          return {
            ...item,
            heading: String(item.heading || item.title || item.name || "Item"),
            body: String(
              item.body || item.content || item.description || item.text || ""
            ),
          }
        })
      } else if (type === "metrics") {
        merged.items = merged.items.map((item: any) => {
          if (typeof item === "string") return { label: "Metric", value: item }
          return {
            ...item,
            label: String(item.label || item.title || item.name || "Metric"),
            value: String(
              item.value || item.val || item.amount || item.count || ""
            ),
            detail:
              item.detail || item.description
                ? String(item.detail || item.description)
                : undefined,
          }
        })
      } else if (type === "timeline") {
        merged.items = merged.items.map((item: any) => {
          if (typeof item === "string") return { title: item, date: "Phase" }
          return {
            ...item,
            title: String(
              item.title ||
                item.heading ||
                item.name ||
                item.milestone ||
                "Milestone"
            ),
            date: String(
              item.date || item.time || item.deadline || item.phase || "Phase"
            ),
            description:
              item.description || item.details || item.body
                ? String(item.description || item.details || item.body)
                : undefined,
          }
        })
      } else if (type === "team") {
        merged.items = merged.items.map((item: any) => {
          if (typeof item === "string") return { name: item, role: "Member" }
          return {
            ...item,
            name: String(item.name || item.member || item.title || "Member"),
            role: String(item.role || item.title || item.position || "Member"),
            bio:
              item.bio || item.description
                ? String(item.bio || item.description)
                : undefined,
          }
        })
      } else if (type === "testimonials") {
        merged.items = merged.items.map((item: any) => {
          if (typeof item === "string") return { quote: item, author: "Client" }
          return {
            ...item,
            quote: String(
              item.quote || item.text || item.content || item.testimonial || ""
            ).replace(/\\"/g, '"'),
            author: String(item.author || item.name || item.client || "Client"),
            role:
              item.role || item.title || item.company
                ? String(item.role || item.title || item.company)
                : undefined,
          }
        })
      } else if (type === "faq") {
        merged.items = merged.items.map((item: any) => {
          return {
            ...item,
            question: String(
              item.question || item.q || item.prompt || item.title || "Question"
            ),
            answer: String(
              item.answer ||
                item.a ||
                item.content ||
                item.body ||
                item.text ||
                "Answer"
            ),
          }
        })
      }
    }

    if (type === "section") {
      merged.title = String(merged.title || merged.heading || "Section")
      merged.content = String(
        merged.content || merged.body || merged.text || ""
      )
    }

    return merged
  }
  return target
}, declarativeBlockBaseSchema) as unknown as typeof declarativeBlockBaseSchema

function preprocessDocumentPayload(val: unknown): unknown {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object" && !Array.isArray(target)) {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>

    let blocksCandidate = inner.blocks
    if (typeof blocksCandidate === "string") {
      try {
        blocksCandidate = JSON.parse(blocksCandidate)
      } catch {
        // retain
      }
    }

    let itemsCandidate = inner.items
    if (typeof itemsCandidate === "string") {
      try {
        itemsCandidate = JSON.parse(itemsCandidate)
      } catch {
        // retain
      }
    }

    let discountCandidate = inner.discount
    if (typeof discountCandidate === "string") {
      try {
        discountCandidate = JSON.parse(discountCandidate)
      } catch {
        // retain
      }
    }

    let taxCandidate = inner.tax
    if (typeof taxCandidate === "string") {
      try {
        taxCandidate = JSON.parse(taxCandidate)
      } catch {
        // retain
      }
    }

    const title = String(
      inner.title ||
        (inner.customerName ? `Proposal for ${inner.customerName}` : "Proposal")
    )

    return {
      ...inner,
      title,
      blocks: Array.isArray(blocksCandidate) ? blocksCandidate : inner.blocks,
      items: Array.isArray(itemsCandidate) ? itemsCandidate : inner.items,
      discount: discountCandidate,
      tax: taxCandidate,
    }
  }
  return target
}

const createProposalBaseSchema = z.object({
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

export const createProposalInput = z.preprocess(
  preprocessDocumentPayload,
  createProposalBaseSchema
) as unknown as typeof createProposalBaseSchema

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

const createInvoiceBaseSchema = z.object({
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

export const createInvoiceInput = z.preprocess(
  preprocessDocumentPayload,
  createInvoiceBaseSchema
) as unknown as typeof createInvoiceBaseSchema

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

const getProposalBaseSchema = z.object({
  id: z.string().min(1),
})

export const getProposalInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id ||
        inner.proposalId ||
        inner.documentId ||
        inner.draftId ||
        inner.title ||
        ""
    ).trim()
    return { ...inner, id }
  }
  return target
}, getProposalBaseSchema) as unknown as typeof getProposalBaseSchema

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

const getInvoiceBaseSchema = z.object({
  id: z.string().min(1),
})

export const getInvoiceInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id ||
        inner.invoiceId ||
        inner.documentId ||
        inner.draftId ||
        inner.title ||
        inner.invoiceNumber ||
        ""
    ).trim()
    return { ...inner, id }
  }
  return target
}, getInvoiceBaseSchema) as unknown as typeof getInvoiceBaseSchema

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

const updateProposalBaseSchema = z.object({
  id: z.string().min(1),
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

export const updateProposalInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object" && !Array.isArray(target)) {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id || inner.proposalId || inner.documentId || inner.draftId || ""
    ).trim()
    const revision = inner.expectedRevision ?? inner.revision ?? inner.version
    const expectedRevision =
      revision !== undefined && !Number.isNaN(Number(revision))
        ? Number(revision)
        : undefined
    const processed = preprocessDocumentPayload(inner) as Record<
      string,
      unknown
    >
    return {
      ...processed,
      id,
      expectedRevision,
    }
  }
  return target
}, updateProposalBaseSchema) as unknown as typeof updateProposalBaseSchema

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

const updateInvoiceBaseSchema = z.object({
  id: z.string().min(1),
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

export const updateInvoiceInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object" && !Array.isArray(target)) {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id || inner.invoiceId || inner.documentId || inner.draftId || ""
    ).trim()
    const revision = inner.expectedRevision ?? inner.revision ?? inner.version
    const expectedRevision =
      revision !== undefined && !Number.isNaN(Number(revision))
        ? Number(revision)
        : undefined
    const processed = preprocessDocumentPayload(inner) as Record<
      string,
      unknown
    >
    return {
      ...processed,
      id,
      expectedRevision,
    }
  }
  return target
}, updateInvoiceBaseSchema) as unknown as typeof updateInvoiceBaseSchema

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

const scheduleDocumentSendBaseSchema = z.object({
  documentType: z.enum(["proposal", "invoice"]),
  documentId: z.string().min(1),
  recipientEmail: emailAddress,
  scheduledFor: z.string(),
  subject: z.string().trim().min(1).max(200).optional(),
  personalMessage: z.string().max(2000).optional(),
  includePdf: z.boolean().optional().default(false),
})

export const scheduleDocumentSendInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const documentId = String(
      inner.documentId ||
        inner.id ||
        inner.proposalId ||
        inner.invoiceId ||
        inner.draftId ||
        ""
    ).trim()
    let documentType = String(
      inner.documentType || (inner.invoiceId ? "invoice" : "proposal")
    ).toLowerCase()
    if (documentType !== "proposal" && documentType !== "invoice")
      documentType = "proposal"
    const recipientEmail = String(
      inner.recipientEmail ||
        inner.to ||
        inner.email ||
        inner.customerEmail ||
        ""
    ).trim()
    const rawScheduledFor =
      inner.scheduledFor ||
      inner.scheduledAt ||
      inner.dateTime ||
      inner.date ||
      inner.time ||
      ""
    const scheduledFor = normalizeIsoDateTime(rawScheduledFor)
    const subject = inner.subject || inner.title
    const personalMessage = inner.personalMessage || inner.message || inner.body
    const includePdf = Boolean(inner.includePdf ?? inner.pdf)

    return {
      ...inner,
      documentId,
      documentType,
      recipientEmail,
      scheduledFor,
      subject: subject ? String(subject) : undefined,
      personalMessage: personalMessage ? String(personalMessage) : undefined,
      includePdf,
    }
  }
  return target
}, scheduleDocumentSendBaseSchema) as unknown as typeof scheduleDocumentSendBaseSchema

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

const listScheduledDispatchesBaseSchema = z.object({
  documentId: z.string().optional(),
  status: z
    .enum(["pending", "processing", "sent", "failed", "cancelled"])
    .optional(),
})

export const listScheduledDispatchesInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const documentId = inner.documentId || inner.id
    return {
      ...inner,
      documentId: documentId ? String(documentId).trim() : undefined,
      status: inner.status,
    }
  }
  return target
}, listScheduledDispatchesBaseSchema) as unknown as typeof listScheduledDispatchesBaseSchema

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

const cancelScheduledDispatchBaseSchema = z.object({
  id: z.string().optional(),
  documentId: z.string().optional(),
})

export const cancelScheduledDispatchInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = inner.id || inner.dispatchId || inner.scheduledDispatchId
    const documentId = inner.documentId || inner.proposalId || inner.invoiceId
    return {
      ...inner,
      id: id ? String(id).trim() : undefined,
      documentId: documentId ? String(documentId).trim() : undefined,
    }
  }
  return target
}, cancelScheduledDispatchBaseSchema) as unknown as typeof cancelScheduledDispatchBaseSchema

export const cancelScheduledDispatchOutput = z.union([
  z.object({
    id: z.string().uuid(),
    status: z.literal("cancelled"),
    cancelledAt: z.string(),
  }),
  toolError,
])

const customerDetailsBaseSchema = z.object({ id: z.string().min(1) })
export const customerDetailsInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id ||
        inner.customerId ||
        inner.companyId ||
        inner.name ||
        inner.customerName ||
        inner.company ||
        ""
    ).trim()
    return { ...inner, id }
  }
  return target
}, customerDetailsBaseSchema) as unknown as typeof customerDetailsBaseSchema

const proposalSummaryBaseSchema = z.object({ id: z.string().min(1) })
export const getProposalSummaryInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id ||
        inner.proposalId ||
        inner.documentId ||
        inner.draftId ||
        inner.title ||
        ""
    ).trim()
    return { ...inner, id }
  }
  return target
}, proposalSummaryBaseSchema) as unknown as typeof proposalSummaryBaseSchema

const invoiceSummaryBaseSchema = z.object({ id: z.string().min(1) })
export const getInvoiceSummaryInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      return { id: target }
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const id = String(
      inner.id ||
        inner.invoiceId ||
        inner.documentId ||
        inner.draftId ||
        inner.title ||
        inner.invoiceNumber ||
        ""
    ).trim()
    return { ...inner, id }
  }
  return target
}, invoiceSummaryBaseSchema) as unknown as typeof invoiceSummaryBaseSchema

export const permissiveEmptyObjectSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      val = JSON.parse(val)
    } catch {
      // retain
    }
  }
  return typeof val === "object" && val !== null ? val : {}
}, z.record(z.string(), z.unknown()).optional().default({}))

export const getCurrentUserNameInput = permissiveEmptyObjectSchema
export const getCurrentUserNameOutput = z.object({
  name: z.string(),
})

const gcalListEventsBaseSchema = z.object({
  days: z.number().int().min(1).max(14).optional().default(7),
  calendarId: z.string().max(200).optional(),
})

export const gcalListEventsInput = z.preprocess((val) => {
  let target = val
  if (typeof target === "string") {
    try {
      target = JSON.parse(target)
    } catch {
      // retain
    }
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>
    const inner = (obj.parameters ||
      obj.input ||
      obj.args ||
      obj.data ||
      obj) as Record<string, unknown>
    const rawDays = inner.days ?? inner.numDays ?? inner.count
    const days =
      rawDays !== undefined && !Number.isNaN(Number(rawDays))
        ? Number(rawDays)
        : undefined
    const calendarId = inner.calendarId || inner.id
    return {
      ...inner,
      days: days ?? 7,
      calendarId: calendarId ? String(calendarId) : undefined,
    }
  }
  return { days: 7 }
}, gcalListEventsBaseSchema) as unknown as typeof gcalListEventsBaseSchema

export const toolInputSchemas = {
  get_current_user_name: getCurrentUserNameInput,
  list_deals: permissiveEmptyObjectSchema,
  deal_analytics: permissiveEmptyObjectSchema,
  list_customers: permissiveEmptyObjectSchema,
  customer_analytics: permissiveEmptyObjectSchema,
  customer_details: customerDetailsInput,
  list_proposals: permissiveEmptyObjectSchema,
  list_invoices: permissiveEmptyObjectSchema,
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
  gcal_list_events: gcalListEventsInput,
  verify_org_access: permissiveEmptyObjectSchema,
  list_integrations: permissiveEmptyObjectSchema,
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
