import type { DocumentTemplate } from "@workspace/document/presentation"
import { resolveDocumentTemplate } from "@workspace/document/presentation"
import {
  buildInvoiceRenderModel,
  buildProposalRenderModel,
  type InvoiceRenderModel,
  type ProposalRenderModel,
} from "@workspace/document/render"
import type { InvoiceDraft, ProposalDraft } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import { captureContinuousPdf, generateReactPdfBlob } from "./pdf-capture"

export type GeneratePdfOptions = {
  document: ProposalDraft | InvoiceDraft
  appTheme?: "light" | "dark"
  template?: DocumentTemplate
  preferContinuous?: boolean
}

export type GenerateModelPdfOptions = {
  model: ProposalRenderModel | InvoiceRenderModel
  template: DocumentTemplate
  preferContinuous?: boolean
}

/**
 * Builds the appropriate RenderModel and compiles it into a binary PDF Buffer on the server.
 */
export async function generateDocumentPdfBuffer({
  document,
  appTheme = "light",
  template: customTemplate,
}: GeneratePdfOptions): Promise<Buffer> {
  const isInvoice = document.kind === "invoice"
  const model = isInvoice
    ? buildInvoiceRenderModel(document, appTheme)
    : buildProposalRenderModel(document, appTheme)

  const template =
    customTemplate ?? resolveDocumentTemplate(document.template, appTheme)

  return captureContinuousPdf({
    model,
    template,
    title: document.data.title,
  })
}

/**
 * Compiles an existing RenderModel into a binary PDF Buffer on the server.
 */
export async function generateModelPdfBuffer({
  model,
  template,
}: GenerateModelPdfOptions): Promise<Buffer> {
  return captureContinuousPdf({
    model,
    template,
    title: model.title,
  })
}

/**
 * Builds the appropriate RenderModel and compiles it into a binary PDF Blob across both browser and server.
 */
export async function generateDocumentPdfBlob(
  options: GeneratePdfOptions
): Promise<Blob> {
  const isInvoice = options.document.kind === "invoice"
  const model = isInvoice
    ? buildInvoiceRenderModel(options.document, options.appTheme)
    : buildProposalRenderModel(options.document, options.appTheme)

  const template =
    options.template ??
    resolveDocumentTemplate(options.document.template, options.appTheme)

  if (typeof window !== "undefined") {
    // In browser: create Blob directly via React-PDF
    return generateReactPdfBlob({ model, template })
  }

  const buffer = await generateDocumentPdfBuffer(options)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer
  return new Blob([arrayBuffer], { type: "application/pdf" })
}

/**
 * Compiles an existing RenderModel into a binary PDF Blob across both browser and server.
 */
export async function generateModelPdfBlob(
  options: GenerateModelPdfOptions
): Promise<Blob> {
  if (typeof window !== "undefined") {
    return generateReactPdfBlob({
      model: options.model,
      template: options.template,
    })
  }

  const buffer = await generateModelPdfBuffer(options)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer
  return new Blob([arrayBuffer], { type: "application/pdf" })
}

/**
 * Converts a Blob to a Base64 string in both browser and server Node/Bun environments.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(",")[1] || ""
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const arrayBuffer = await blob.arrayBuffer()
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arrayBuffer).toString("base64")
  }

  const bytes = new Uint8Array(arrayBuffer)
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts a Base64 string into a Blob across browser and server.
 */
export function base64ToBlob(
  base64: string,
  mimeType = "application/pdf"
): Blob {
  if (typeof window !== "undefined") {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const buf = Buffer.from(base64, "base64")
  return new Blob([buf], { type: mimeType })
}

/**
 * Builds the appropriate RenderModel and compiles it into a Base64 string across browser and server.
 */
export async function generateDocumentPdfBase64(
  options: GeneratePdfOptions
): Promise<string> {
  const blob = await generateDocumentPdfBlob(options)
  return blobToBase64(blob)
}

export type ExportPdfOptions = GeneratePdfOptions & {
  filename?: string
}

/**
 * Generates the PDF Blob and triggers a direct browser download.
 */
export async function exportDocumentToPdf({
  document,
  appTheme = "light",
  template,
  filename,
}: ExportPdfOptions): Promise<void> {
  const blob = await generateDocumentPdfBlob({
    document,
    appTheme,
    template,
  })

  const isInvoice = document.kind === "invoice"
  const rawTitle = document.data.title || (isInvoice ? "Invoice" : "Proposal")
  const cleanTitle =
    stripHtml(rawTitle)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_") || (isInvoice ? "Invoice" : "Proposal")

  const identifier =
    isInvoice && "invoiceNumber" in document.data && document.data.invoiceNumber
      ? `_${document.data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}`
      : ""

  const downloadName = filename || `${cleanTitle}${identifier}.pdf`

  triggerBlobDownload(blob, downloadName)
}

/**
 * Triggers a direct browser file download for a given Blob.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return

  const url = URL.createObjectURL(blob)
  const link = window.document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)

  // Delay revoking URL slightly to ensure download starts cleanly
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
