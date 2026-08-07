import { db, eq, schema } from "@workspace/database"

const MAX_METADATA_DEPTH = 6
const UNSAFE_METADATA_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Recursively sanitize user-supplied event metadata to JSON-safe plain values,
 * strip prototype-polluting keys, and cap nesting depth before persistence.
 */
function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > MAX_METADATA_DEPTH) {
    return null
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item, depth + 1))
  }
  const sanitized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (UNSAFE_METADATA_KEYS.has(key)) continue
    sanitized[key] = sanitizeMetadata(item, depth + 1)
  }
  return sanitized
}

export type RecordClientEventInput = {
  documentType: "proposal" | "invoice"
  token: string
  eventType:
    | "document.viewed"
    | "document.downloaded"
    | "signature.started"
    | "payment.initiated"
    | (string & {})
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export type RecordClientEventResult =
  | { success: true; eventId: string }
  | { success: false; reason: "not_found" }

export async function recordClientEvent(
  input: RecordClientEventInput
): Promise<RecordClientEventResult> {
  const timestamp = new Date().toISOString()
  const meta = {
    ...(sanitizeMetadata(input.metadata) as
      | Record<string, unknown>
      | undefined),
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    timestamp,
  }

  if (input.documentType === "proposal") {
    const [link] = await db
      .select({
        id: schema.proposalPublicLink.id,
        proposalSnapshotId: schema.proposalPublicLink.proposalSnapshotId,
      })
      .from(schema.proposalPublicLink)
      .where(eq(schema.proposalPublicLink.token, input.token))
      .limit(1)

    if (!link) {
      return { success: false, reason: "not_found" }
    }

    const [eventRow] = await db
      .insert(schema.proposalEvent)
      .values({
        proposalSnapshotId: link.proposalSnapshotId,
        publicLinkId: link.id,
        eventType: input.eventType,
        metadata: meta,
      })
      .returning()

    if (!eventRow) {
      throw new Error("Failed to record proposal event")
    }

    return { success: true, eventId: eventRow.id }
  }

  if (input.documentType === "invoice") {
    const [link] = await db
      .select({
        id: schema.invoicePublicLink.id,
        invoiceSnapshotId: schema.invoicePublicLink.invoiceSnapshotId,
      })
      .from(schema.invoicePublicLink)
      .where(eq(schema.invoicePublicLink.token, input.token))
      .limit(1)

    if (!link) {
      return { success: false, reason: "not_found" }
    }

    const [eventRow] = await db
      .insert(schema.invoiceEvent)
      .values({
        invoiceSnapshotId: link.invoiceSnapshotId,
        publicLinkId: link.id,
        eventType: input.eventType,
        metadata: meta,
      })
      .returning()

    if (!eventRow) {
      throw new Error("Failed to record invoice event")
    }

    return { success: true, eventId: eventRow.id }
  }

  throw new Error(`Unsupported document type: ${input.documentType}`)
}
