import { finalizeInvoiceDraft, finalizeProposalDraft } from "./finalize"
import {
  type InvoiceDraft,
  type ProposalDraft,
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "./schema"

export type BackfillSnapshotResult =
  | {
      success: true
      kind: "proposal" | "invoice"
      document: ProposalDraft | InvoiceDraft
      contentHash: string
      templateId: string
      templateVersion: number
      calculationVersion: string | null
      changed: boolean
    }
  | {
      success: false
      error: string
    }

export function backfillSnapshotDocument(
  rawDocument: unknown,
  fallbackScheme: "light" | "dark" = "light"
): BackfillSnapshotResult {
  if (!rawDocument || typeof rawDocument !== "object") {
    return { success: false, error: "Invalid snapshot document payload" }
  }

  const kind = (rawDocument as Record<string, unknown>).kind

  if (kind === "proposal") {
    const parsed = safeParseProposalDraft(rawDocument)
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid proposal draft schema: ${parsed.error.message}`,
      }
    }

    const hadFullOverrides =
      parsed.data.template.overrides &&
      typeof parsed.data.template.overrides === "object" &&
      "canvasBackground" in parsed.data.template.overrides &&
      "pageBackground" in parsed.data.template.overrides &&
      "foreground" in parsed.data.template.overrides

    const finalized = finalizeProposalDraft(parsed.data, fallbackScheme)

    return {
      success: true,
      kind: "proposal",
      document: finalized.document,
      contentHash: finalized.contentHash,
      templateId: finalized.templateId,
      templateVersion: finalized.templateVersion,
      calculationVersion: finalized.calculationVersion,
      changed: !hadFullOverrides,
    }
  }

  if (kind === "invoice") {
    const parsed = safeParseInvoiceDraft(rawDocument)
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid invoice draft schema: ${parsed.error.message}`,
      }
    }

    const hadFullOverrides =
      parsed.data.template.overrides &&
      typeof parsed.data.template.overrides === "object" &&
      "canvasBackground" in parsed.data.template.overrides &&
      "pageBackground" in parsed.data.template.overrides &&
      "foreground" in parsed.data.template.overrides

    const finalized = finalizeInvoiceDraft(parsed.data, fallbackScheme)

    return {
      success: true,
      kind: "invoice",
      document: finalized.document,
      contentHash: finalized.contentHash,
      templateId: finalized.templateId,
      templateVersion: finalized.templateVersion,
      calculationVersion: finalized.calculationVersion,
      changed: !hadFullOverrides,
    }
  }

  return {
    success: false,
    error: `Unknown document kind: ${String(kind)}`,
  }
}
