const DECIMAL_DRAFT_PATTERN = /^\d*(?:\.\d*)?$/

export function isCanvasNumberDraft(value: string) {
  return DECIMAL_DRAFT_PATTERN.test(value)
}

export function parseCanvasNumberDraft(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function normalizeCanvasNumberDraft(value: string) {
  return String(parseCanvasNumberDraft(value))
}
