import { stripHtml } from "@workspace/document/text"
import {
  base64ToBlob,
  exportDocumentToPdf as baseExportDocumentToPdf,
  generateDocumentPdfBase64 as baseGenerateDocumentPdfBase64,
  type ExportPdfOptions,
  type GeneratePdfOptions,
  triggerBlobDownload,
} from "@workspace/document-pdf"
import { exportDocumentPdfServerFn } from "@/server/pdf-export"

export * from "@workspace/document-pdf"

/**
 * Enhanced client PDF exporter that requests continuous tall PDF from the server,
 * falling back gracefully to browser-side React-PDF generation if offline or unavailable.
 */
export async function exportDocumentToPdf(
  options: ExportPdfOptions
): Promise<void> {
  try {
    const serverResult = await exportDocumentPdfServerFn({
      data: {
        document: options.document,
        appTheme: options.appTheme ?? "light",
      },
    })

    if (serverResult.success && serverResult.base64) {
      const blob = base64ToBlob(serverResult.base64, "application/pdf")
      const isInvoice = options.document.kind === "invoice"
      const rawTitle =
        options.document.data.title || (isInvoice ? "Invoice" : "Proposal")
      const cleanTitle =
        stripHtml(rawTitle)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "_") ||
        (isInvoice ? "Invoice" : "Proposal")

      const identifier =
        isInvoice &&
        "invoiceNumber" in options.document.data &&
        options.document.data.invoiceNumber
          ? `_${options.document.data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}`
          : ""

      const downloadName = options.filename || `${cleanTitle}${identifier}.pdf`
      triggerBlobDownload(blob, downloadName)
      return
    }
  } catch (_err) {
    // Fall back to client-side renderer
  }

  return baseExportDocumentToPdf(options)
}

/**
 * Enhanced client Base64 generator that requests continuous PDF from the server,
 * falling back gracefully to browser-side generation.
 */
export async function generateDocumentPdfBase64(
  options: GeneratePdfOptions
): Promise<string> {
  try {
    const serverResult = await exportDocumentPdfServerFn({
      data: {
        document: options.document,
        appTheme: options.appTheme ?? "light",
      },
    })

    if (serverResult.success && serverResult.base64) {
      return serverResult.base64
    }
  } catch (_err) {
    // Fall back to client
  }

  return baseGenerateDocumentPdfBase64(options)
}
