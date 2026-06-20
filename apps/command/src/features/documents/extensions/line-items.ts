import { ReactNodeViewRenderer } from "@tiptap/react"
import { createPricingExtension } from "@workspace/document-editor"

import LineItemsView from "@/features/documents/components/line-items-view"

export const LineItems = createPricingExtension(() =>
  ReactNodeViewRenderer(LineItemsView, { stopEvent: () => true })
)
