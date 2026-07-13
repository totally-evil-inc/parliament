import { ReactNodeViewRenderer } from "@tiptap/react"
import { createPartyHeaderExtension } from "../../extensions/document"

import DocumentHeaderView from "../../components/document-header-view"

export const DocumentHeader = createPartyHeaderExtension(() =>
  ReactNodeViewRenderer(DocumentHeaderView, { stopEvent: () => true })
)
