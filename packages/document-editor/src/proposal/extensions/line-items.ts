import { ReactNodeViewRenderer } from "@tiptap/react"
import LineItemsView from "../../components/line-items-view"
import { createPricingExtension } from "../../extensions/document"

export const LineItems = createPricingExtension(() =>
  ReactNodeViewRenderer(LineItemsView, { stopEvent: () => true })
)
