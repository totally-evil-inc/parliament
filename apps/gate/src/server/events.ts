import { db, eq, schema } from "@workspace/database"

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
    ...(input.metadata || {}),
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
