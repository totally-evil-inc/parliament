import { defaultDocumentTemplate } from "./templates"
import type {
  DocumentDefinition,
  DocumentRenderData,
  DocumentSnapshot,
  DocumentTemplate,
  DocumentType,
} from "./types"
import type { JSONContent } from "@tiptap/core"

export const DOCUMENT_RENDERER_VERSION = "document-renderer@2026-06-20.1"

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function cloneContent(content: JSONContent): JSONContent {
  return JSON.parse(JSON.stringify(content)) as JSONContent
}

function firstNodeOfType(content: JSONContent, type: string) {
  return content.content?.find((node) => node.type === type)
}

export function createDocumentSnapshot({
  content,
  definition,
  documentId,
  now = new Date(),
  renderData = {},
  template = defaultDocumentTemplate,
}: {
  content: JSONContent
  definition: Pick<DocumentDefinition, "type">
  documentId?: string
  now?: Date
  renderData?: DocumentRenderData
  template?: DocumentTemplate
}): DocumentSnapshot {
  const snapshotContent = cloneContent(content)
  const createdAt = now.toISOString()
  const issueDate = renderData.issueDate ?? toDateValue(now)
  const header = firstNodeOfType(snapshotContent, "documentHeader")

  if (header) {
    header.attrs = {
      ...(header.attrs ?? {}),
      date: String(header.attrs?.date || issueDate),
      due: String(header.attrs?.due || renderData.dueDate || ""),
      validUntil: String(
        header.attrs?.validUntil ||
          renderData.validUntil ||
          renderData.dueDate ||
          ""
      ),
    }
  }

  const lineItems = firstNodeOfType(snapshotContent, "lineItems")

  if (lineItems) {
    lineItems.attrs = {
      ...(lineItems.attrs ?? {}),
      signerName: String(
        lineItems.attrs?.signerName || renderData.signerName || ""
      ),
      signerTitle: String(
        lineItems.attrs?.signerTitle || renderData.signerTitle || ""
      ),
    }
  }

  return {
    schemaVersion: 1,
    rendererVersion: DOCUMENT_RENDERER_VERSION,
    documentType: definition.type as DocumentType,
    documentId: documentId ?? `${definition.type}-${createdAt}`,
    content: snapshotContent,
    template,
    renderData: {
      ...renderData,
      issueDate,
    },
    createdAt,
  }
}
