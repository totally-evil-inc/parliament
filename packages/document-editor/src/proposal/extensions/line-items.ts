import { ReactNodeViewRenderer } from "@tiptap/react"
import { createPricingExtension } from "../../extensions/document"

import LineItemsView from "../../components/line-items-view"

export const LineItems = createPricingExtension(() =>
  ReactNodeViewRenderer(LineItemsView, { stopEvent: () => true })
)
