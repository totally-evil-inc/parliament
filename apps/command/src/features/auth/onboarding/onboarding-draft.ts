export type OrganizationDraft = {
  organizationName: string
  organizationSlug: string
  organizationId?: string
}

const DRAFT_KEY = "command:onboarding-draft:v1"

export function readDraft(): OrganizationDraft | null {
  if (typeof window === "undefined") return null

  const raw = window.sessionStorage.getItem(DRAFT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationDraft>

    if (!parsed.organizationName || !parsed.organizationSlug) return null

    return {
      organizationName: parsed.organizationName,
      organizationSlug: parsed.organizationSlug,
      organizationId: parsed.organizationId,
    }
  } catch {
    return null
  }
}

export function writeDraft(draft: OrganizationDraft | null) {
  if (typeof window === "undefined") return

  if (!draft) {
    window.sessionStorage.removeItem(DRAFT_KEY)
    return
  }

  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}
