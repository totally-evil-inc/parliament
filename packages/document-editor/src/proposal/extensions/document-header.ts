import { ReactNodeViewRenderer } from "@tiptap/react"
import DocumentHeaderView from "../../components/document-header-view"
import { createPartyHeaderExtension } from "../../extensions/document"

export const DocumentHeader = createPartyHeaderExtension(() =>
  ReactNodeViewRenderer(DocumentHeaderView, { stopEvent: () => true })
)
