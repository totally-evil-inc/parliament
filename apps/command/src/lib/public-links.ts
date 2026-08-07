export type PublicDocumentType = "proposal" | "invoice"

const DEFAULT_GATE_URL = "http://localhost:4100"

export function getGateBaseUrl(): string {
  return (
    (import.meta.env.VITE_GATE_URL as string | undefined) || DEFAULT_GATE_URL
  ).replace(/\/$/, "")
}

export function buildPublicLink(
  documentType: PublicDocumentType,
  token: string
): string {
  const prefix = documentType === "proposal" ? "p" : "i"
  return `${getGateBaseUrl()}/${prefix}/${encodeURIComponent(token)}`
}
