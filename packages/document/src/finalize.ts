import { calculateInvoicePricing, calculateProposalPricing } from "./calculate"
import { buildInvoiceRenderModel, buildProposalRenderModel } from "./render"
import type { InvoiceDraft, ProposalDraft } from "./schema"
import { normalizeInvoiceDraft, normalizeProposalDraft } from "./schema"

export type ProposalSnapshotPayload = {
  document: ProposalDraft
  contentHash: string
  templateId: string
  templateVersion: number
  calculationVersion: string | null
}

export function finalizeProposalDraft(
  input: unknown,
  fallbackScheme: "light" | "dark" = "light"
): ProposalSnapshotPayload {
  const document = normalizeProposalDraft(input, fallbackScheme)
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

export type InvoiceSnapshotPayload = {
  document: InvoiceDraft
  contentHash: string
  templateId: string
  templateVersion: number
  calculationVersion: string | null
}

export function finalizeInvoiceDraft(
  input: unknown,
  fallbackScheme: "light" | "dark" = "light"
): InvoiceSnapshotPayload {
  const document = normalizeInvoiceDraft(input, fallbackScheme)
  const model = buildInvoiceRenderModel(document)
  const calculationVersion = document.data.pricing
    ? calculateInvoicePricing(document.data.pricing).calculationVersion
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
  return sha256Sync(stableStringify(value))
}

function sha256Sync(ascii: string): string {
  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  let i: number, j: number
  let result = ""

  const words: number[] = []
  const asciiBitLength = ascii.length * 8

  const hash: number[] = []
  const k: number[] = []
  let primeCounter = 0

  const isComposite: Record<number, number> = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }

  let formatted = `${ascii}\x80`
  while ((formatted.length % 64) - 56) formatted += "\x00"
  for (i = 0; i < formatted.length; i++) {
    j = formatted.charCodeAt(i)
    words[i >> 2] |= j << ((3 - (i % 4)) * 8)
  }
  words[words.length] = (asciiBitLength / maxWord) | 0
  words[words.length] = asciiBitLength

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16)
    const oldHash = [...hash]

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2]
      const s0 =
        ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3)
      const s1 =
        ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10)
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0

      const a = hash[0],
        e = hash[4]
      const temp1 =
        hash[7] +
        (((e >>> 6) | (e << 26)) ^
          ((e >>> 11) | (e << 21)) ^
          ((e >>> 25) | (e << 7))) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        w[i]
      const temp2 =
        (((a >>> 2) | (a << 30)) ^
          ((a >>> 13) | (a << 19)) ^
          ((a >>> 22) | (a << 10))) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))

      hash.unshift((temp1 + temp2) | 0)
      hash.pop()
      hash[4] = (hash[4] + temp1) | 0
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      result += (b < 16 ? "0" : "") + b.toString(16)
    }
  }
  return result
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
