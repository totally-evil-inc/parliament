import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import { createFileRoute } from "@tanstack/react-router"
import { resolveDocumentTemplate } from "@workspace/document/presentation"
import { createProposalDraft } from "@workspace/document/proposal"
import {
  buildInvoiceRenderModel,
  buildProposalRenderModel,
} from "@workspace/document/render"
import {
  type InvoiceDraft,
  type ProposalDraft,
  safeParseInvoiceDraft,
  safeParseProposalDraft,
} from "@workspace/document/schema"
import { DocumentHtmlView, exportDocumentToPdf } from "@workspace/document-pdf"
import { Button } from "@workspace/ui/components/button"
import * as React from "react"

export const Route = createFileRoute("/documents/print")({
  component: PrintRoute,
})

function PrintRoute() {
  const [result, setResult] = React.useState<ReturnType<
    typeof readDraft
  > | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)

  React.useEffect(() => setResult(readDraft()), [])
  React.useEffect(() => {
    if (!result?.success || typeof window === "undefined") return
    window.document.documentElement.classList.add("document-print-root")
    return () => {
      window.document.documentElement.classList.remove("document-print-root")
    }
  }, [result])

  if (!result) return null
  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-destructive text-sm">
        {result.error}
      </div>
    )
  }

  const document = result.document
  const template = resolveDocumentTemplate(document.template)

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true)
      await exportDocumentToPdf({
        document,
        template,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const model =
    document.kind === "invoice"
      ? buildInvoiceRenderModel(document)
      : buildProposalRenderModel(document)

  return (
    <>
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <Button
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="gap-2 shadow-lg"
          size="sm"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {isExporting ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      <DocumentHtmlView model={model} template={template} />
    </>
  )
}

function readDraft():
  | { success: true; document: ProposalDraft | InvoiceDraft }
  | { success: false; error: string } {
  if (typeof window === "undefined") {
    return {
      success: true,
      document: createProposalDraft({ id: "proposal-print-preview" }),
    }
  }
  const key = new URLSearchParams(window.location.search).get("draftKey")
  if (!key) return { success: false, error: "No document draft was provided." }
  const raw = window.sessionStorage.getItem(key)
  if (!raw)
    return {
      success: false,
      error: "The document draft is unavailable or expired.",
    }
  try {
    const json = JSON.parse(raw)
    const parsedProposal = safeParseProposalDraft(json)
    if (parsedProposal.success) {
      return { success: true, document: parsedProposal.data }
    }
    const parsedInvoice = safeParseInvoiceDraft(json)
    if (parsedInvoice.success) {
      return { success: true, document: parsedInvoice.data }
    }
    return {
      success: false,
      error: "The document draft is invalid or uses an unsupported version.",
    }
  } catch {
    return { success: false, error: "The document draft could not be decoded." }
  }
}
