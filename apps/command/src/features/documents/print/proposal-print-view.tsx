import type { DocumentTemplate } from "@workspace/document/presentation"
import type { ProposalRenderModel } from "@workspace/document/render"
import { DocumentHtmlView } from "@workspace/document-pdf"

export function ProposalPrintView({
  model,
  template,
}: {
  model: ProposalRenderModel
  template: DocumentTemplate
}) {
  return <DocumentHtmlView model={model} template={template} />
}

export * from "./rich-text-renderer"
