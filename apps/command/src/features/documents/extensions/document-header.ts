import { ReactNodeViewRenderer } from "@tiptap/react"
import { createPartyHeaderExtension } from "@workspace/document-editor"

import DocumentHeaderView from "@/features/documents/components/document-header-view"

export const DocumentHeader = createPartyHeaderExtension(() =>
  ReactNodeViewRenderer(DocumentHeaderView, { stopEvent: () => true })
)
