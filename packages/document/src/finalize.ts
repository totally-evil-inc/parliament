import { createHash } from "node:crypto"
import { calculateProposalPricing } from "./calculate"
import { buildProposalRenderModel } from "./render"
import type { ProposalDraft } from "./schema"
import { parseProposalDraft } from "./schema"

export type ProposalSnapshotPayload = {
  document: ProposalDraft
  contentHash: string
  templateId: string
  templateVersion: number
  calculationVersion: string | null
}

export function finalizeProposalDraft(input: unknown): ProposalSnapshotPayload {
  const document = parseProposalDraft(input)
  const model = buildProposalRenderModel(document)
  const calculationVersion = document.data.pricing
    ? calculateProposalPricing(document.data.pricing).calculationVersion
    : null

  return {
    document,
    contentHash: hashNormalized({
      document,
      renderModel: model,
      calculationVersion,
    }),
    templateId: document.template.id,
    templateVersion: document.template.version,
    calculationVersion,
  }
}

function hashNormalized(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`
}
