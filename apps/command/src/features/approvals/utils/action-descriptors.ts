/**
 * Action Metadata Descriptors & Argument Humanizer.
 *
 * Provides defensive parsing, risk classification, intent summaries, and formatted parameter
 * pairs for AI agent tool invocations and durable approvals.
 */

export type ActionRiskLevel = "high" | "medium" | "low"

export interface ActionParameter {
  label: string
  value: string
  highlight?: boolean
  badge?: boolean
}

export interface ActionDescriptor {
  toolName: string
  displayTitle: string
  category:
    | "document"
    | "dispatch"
    | "email"
    | "calendar"
    | "crm"
    | "clarification"
    | "general"
  riskLevel: ActionRiskLevel
  intentSummary: string
  authorizationReason: string
  keyParameters: ActionParameter[]
}

/**
 * Defensively coerces unknown value to a non-empty trimmed string or fallback.
 */
export function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return fallback
}

/**
 * Defensively unpacks an unknown value into an object dictionary.
 */
export function safeObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>
        }
      } catch {
        return {}
      }
    }
  }
  return {}
}

/**
 * Defensively formats minor units (e.g. cents) into currency representation.
 */
export function formatCurrencyMinor(
  amountMinor: unknown,
  currency: unknown = "USD"
): string {
  const curr =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : "USD"
  const numeric =
    typeof amountMinor === "number" ? amountMinor : Number(amountMinor)

  if (Number.isNaN(numeric)) {
    return "$0.00"
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric / 100)
  } catch {
    return `$${(numeric / 100).toFixed(2)}`
  }
}

/**
 * Defensively formats ISO or timestamp dates into readable local format.
 */
export function formatDateTime(dateVal: unknown): string {
  if (!dateVal) return "N/A"
  try {
    const date =
      typeof dateVal === "string" || typeof dateVal === "number"
        ? new Date(dateVal)
        : dateVal instanceof Date
          ? dateVal
          : null
    if (!date || Number.isNaN(date.getTime())) {
      return safeString(dateVal, "N/A")
    }
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return safeString(dateVal, "N/A")
  }
}

/**
 * Humanizes camelCase or snake_case strings into title case.
 */
export function humanizeTitle(str: string): string {
  if (!str) return "Unknown Action"
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ")
}

/**
 * Generates an ActionDescriptor with categorized intent, risk assessment,
 * and high-priority structured parameters for human review.
 */
export function describeToolAction(
  rawToolName: string,
  rawArgs?: unknown,
  customSummary?: string
): ActionDescriptor {
  const toolName = safeString(rawToolName, "unknown_tool")
  const args = safeObject(rawArgs)
  const normName = toolName.toLowerCase().replace(/[-_]/g, "")

  // 1. Send Proposal / Invoice or Document Dispatch
  if (normName.includes("sendproposal") || normName.includes("sendinvoice")) {
    const isInvoice = normName.includes("invoice")
    const docType = isInvoice ? "Invoice" : "Proposal"
    const recipient = safeString(
      args.recipientEmail || args.to || args.recipient || args.email
    )
    const docId = safeString(
      args.documentId || args.proposalId || args.invoiceId || args.id
    )
    const totalMinor =
      args.totalMinorUnits ?? args.totalMinor ?? args.amountMinor
    const currency = safeString(args.currency, "USD")

    const params: ActionParameter[] = []
    if (recipient)
      params.push({ label: "Recipient", value: recipient, highlight: true })
    if (totalMinor !== undefined) {
      params.push({
        label: "Total Amount",
        value: formatCurrencyMinor(totalMinor, currency),
        highlight: true,
      })
    }
    if (docId) params.push({ label: "Document ID", value: docId, badge: true })

    return {
      toolName,
      displayTitle: `Send ${docType}`,
      category: "dispatch",
      riskLevel: "high",
      intentSummary:
        customSummary ||
        `Transmit live ${docType.toLowerCase()} to client via email dispatch.`,
      authorizationReason:
        "Direct client transmission with contractual/financial implications.",
      keyParameters: params,
    }
  }

  // 2. Schedule Document Send
  if (
    normName.includes("scheduledocumentsend") ||
    normName.includes("scheduledispatch")
  ) {
    const recipient = safeString(
      args.recipientEmail || args.to || args.recipient
    )
    const scheduledFor = formatDateTime(
      args.scheduledFor || args.sendAt || args.scheduledAt
    )
    const docType = safeString(args.documentType, "Document")

    const params: ActionParameter[] = []
    if (recipient)
      params.push({ label: "Recipient", value: recipient, highlight: true })
    if (scheduledFor !== "N/A")
      params.push({
        label: "Scheduled For",
        value: scheduledFor,
        highlight: true,
      })
    if (docType)
      params.push({ label: "Type", value: humanizeTitle(docType), badge: true })

    return {
      toolName,
      displayTitle: "Schedule Document Dispatch",
      category: "dispatch",
      riskLevel: "high",
      intentSummary:
        customSummary ||
        "Queue an automated document dispatch for future delivery.",
      authorizationReason:
        "Will automatically dispatch external email at the scheduled timestamp.",
      keyParameters: params,
    }
  }

  // 3. Create or Update Proposal / Invoice
  if (
    normName.includes("createproposal") ||
    normName.includes("updateproposal") ||
    normName.includes("createinvoice") ||
    normName.includes("updateinvoice")
  ) {
    const isInvoice = normName.includes("invoice")
    const isUpdate = normName.includes("update")
    const docType = isInvoice ? "Invoice" : "Proposal"
    const verb = isUpdate ? "Update" : "Create"
    const title = safeString(args.title || args.name, `New ${docType}`)
    const customer = safeString(
      args.customerName || args.clientName || args.customer
    )
    const totalMinor =
      args.totalMinorUnits ?? args.totalMinor ?? args.amountMinor
    const currency = safeString(args.currency, "USD")

    const params: ActionParameter[] = []
    if (title) params.push({ label: "Title", value: title, highlight: true })
    if (customer) params.push({ label: "Client", value: customer })
    if (totalMinor !== undefined) {
      params.push({
        label: "Total Value",
        value: formatCurrencyMinor(totalMinor, currency),
        highlight: true,
      })
    }

    return {
      toolName,
      displayTitle: `${verb} ${docType}`,
      category: "document",
      riskLevel: "medium",
      intentSummary:
        customSummary ||
        `${verb} ${docType.toLowerCase()} draft with pricing and line items.`,
      authorizationReason:
        "Generates or updates formal commercial documents in workspace storage.",
      keyParameters: params,
    }
  }

  // 4. Gmail Send or Send Email
  if (normName.includes("gmailsend") || normName.includes("sendemail")) {
    const to = safeString(args.to || args.recipient || args.recipientEmail)
    const subject = safeString(args.subject, "No Subject")

    const params: ActionParameter[] = []
    if (to) params.push({ label: "To", value: to, highlight: true })
    if (subject) params.push({ label: "Subject", value: subject })

    return {
      toolName,
      displayTitle: "Send Email",
      category: "email",
      riskLevel: "high",
      intentSummary:
        customSummary || `Dispatch outbound email to ${to || "recipient"}.`,
      authorizationReason:
        "Direct outbound communication cannot be recalled once dispatched.",
      keyParameters: params,
    }
  }

  // 5. Gmail Create Draft
  if (normName.includes("gmaildraft") || normName.includes("createdraft")) {
    const to = safeString(args.to || args.recipient)
    const subject = safeString(args.subject, "Draft")

    const params: ActionParameter[] = []
    if (to) params.push({ label: "To", value: to })
    if (subject)
      params.push({ label: "Subject", value: subject, highlight: true })

    return {
      toolName,
      displayTitle: "Create Gmail Draft",
      category: "email",
      riskLevel: "medium",
      intentSummary:
        customSummary || "Save an email draft in connected Gmail inbox.",
      authorizationReason: "Modifies draft emails in connected Gmail account.",
      keyParameters: params,
    }
  }

  // 6. Google Calendar Events
  if (
    normName.includes("gcal") ||
    normName.includes("scheduleevent") ||
    normName.includes("calendar")
  ) {
    const isCancel = normName.includes("cancel") || normName.includes("delete")
    const title = safeString(
      args.summary || args.title || args.eventTitle,
      "Meeting"
    )
    const start = formatDateTime(args.startTime || args.start || args.date)
    const attendees = Array.isArray(args.attendees)
      ? args.attendees
          .map((a) => safeString(a))
          .filter(Boolean)
          .join(", ")
      : safeString(args.attendees)

    const params: ActionParameter[] = []
    if (title) params.push({ label: "Event", value: title, highlight: true })
    if (start !== "N/A") params.push({ label: "Time", value: start })
    if (attendees) params.push({ label: "Attendees", value: attendees })

    return {
      toolName,
      displayTitle: isCancel
        ? "Cancel Calendar Event"
        : "Schedule Calendar Event",
      category: "calendar",
      riskLevel: isCancel ? "high" : "medium",
      intentSummary:
        customSummary ||
        (isCancel
          ? `Cancel calendar event "${title}".`
          : `Create calendar invite for "${title}".`),
      authorizationReason: isCancel
        ? "Removes event and notifies participants."
        : "Sends calendar invitations to participants.",
      keyParameters: params,
    }
  }

  // 7. CRM Deal & Customer Mutations
  if (normName.includes("deal") || normName.includes("customer")) {
    const isDeal = normName.includes("deal")
    const isStage = normName.includes("stage")
    const entity = isDeal ? "Deal" : "Customer"
    const name = safeString(
      args.name || args.title || args.companyName || args.customerName,
      `Target ${entity}`
    )
    const stage = safeString(args.stage || args.newStage)
    const value = args.valueMinorUnits ?? args.value ?? args.amount

    const params: ActionParameter[] = []
    if (name) params.push({ label: entity, value: name, highlight: true })
    if (stage)
      params.push({ label: "Stage", value: humanizeTitle(stage), badge: true })
    if (value !== undefined) {
      params.push({
        label: "Value",
        value:
          typeof value === "number"
            ? formatCurrencyMinor(value)
            : String(value),
      })
    }

    return {
      toolName,
      displayTitle: isStage ? `Update ${entity} Stage` : `Update ${entity}`,
      category: "crm",
      riskLevel: "medium",
      intentSummary: customSummary || `Modify CRM record for ${name}.`,
      authorizationReason:
        "Updates customer relationship data and pipeline metrics.",
      keyParameters: params,
    }
  }

  // 8. Clarifying Questions
  if (normName.includes("clarifyingquestion")) {
    return {
      toolName,
      displayTitle: "Clarification Requested",
      category: "clarification",
      riskLevel: "low",
      intentSummary:
        customSummary ||
        "Agent requests additional user preferences or details.",
      authorizationReason:
        "Interactive questionnaire to guide assistant workflow.",
      keyParameters: [],
    }
  }

  // 9. Generic / Custom Tools Fallback
  const params: ActionParameter[] = []
  for (const [k, v] of Object.entries(args).slice(0, 4)) {
    if (v !== undefined && v !== null && typeof v !== "object") {
      params.push({ label: humanizeTitle(k), value: String(v) })
    }
  }

  return {
    toolName,
    displayTitle: humanizeTitle(toolName),
    category: "general",
    riskLevel: "medium",
    intentSummary:
      customSummary ||
      `Execute ${humanizeTitle(toolName)} action with provided parameters.`,
    authorizationReason:
      "Action modifies workspace resources or external systems.",
    keyParameters: params,
  }
}
