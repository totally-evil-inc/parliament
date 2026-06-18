import type { DocumentHeaderLayoutId } from "./types"

export type DocumentHeaderLayoutDefinition = {
  id: DocumentHeaderLayoutId
  name: string
  description: string
}

export const documentHeaderLayouts = [
  {
    id: "mark-left-dates-right",
    name: "Classic",
    description: "Logo and title on the left with stacked dates on the right.",
  },
  {
    id: "centered-stack",
    name: "Centered",
    description: "Logo, dates, and title centered for a formal cover style.",
  },
  {
    id: "left-stack",
    name: "Left Stack",
    description: "Logo, title, and dates stacked on the left edge.",
  },
  {
    id: "editorial-band",
    name: "Editorial",
    description: "Centered title with logo and dates anchoring the band.",
  },
] satisfies Array<DocumentHeaderLayoutDefinition>

export function isDocumentHeaderLayoutId(
  value: unknown
): value is DocumentHeaderLayoutId {
  return documentHeaderLayouts.some((layout) => layout.id === value)
}
