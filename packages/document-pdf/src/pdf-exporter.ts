import { pdf } from "@react-pdf/renderer"
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
import * as React from "react"
import { DocumentPdfDocument } from "./document-pdf-document"

export type GeneratePdfOptions = {
  document: ProposalDraft | InvoiceDraft
  appTheme?: "light" | "dark"
  template?: DocumentTemplate
}

export type GenerateModelPdfOptions = {
  model: ProposalRenderModel | InvoiceRenderModel
  template: DocumentTemplate
}

/**
 * Builds the appropriate RenderModel and compiles it into a binary PDF Blob using React-PDF.
 */
export async function generateDocumentPdfBlob({
  document,
  appTheme = "light",
  template: customTemplate,
}: GeneratePdfOptions): Promise<Blob> {
  const isInvoice = document.kind === "invoice"
  const model = isInvoice
    ? buildInvoiceRenderModel(document, appTheme)
    : buildProposalRenderModel(document, appTheme)

  const template =
    customTemplate ?? resolveDocumentTemplate(document.template, appTheme)

  const element = React.createElement(DocumentPdfDocument, {
    model,
    template,
  })
  // biome-ignore lint/suspicious/noExplicitAny: react-pdf accepts JSX Document element
  const pdfInstance = pdf(element as any)
  return await pdfInstance.toBlob()
}

/**
 * Compiles an existing RenderModel into a binary PDF Blob.
 */
export async function generateModelPdfBlob({
  model,
  template,
}: GenerateModelPdfOptions): Promise<Blob> {
  const element = React.createElement(DocumentPdfDocument, {
    model,
    template,
  })
  // biome-ignore lint/suspicious/noExplicitAny: react-pdf accepts JSX Document element
  const pdfInstance = pdf(element as any)
  return await pdfInstance.toBlob()
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
 * Builds the appropriate RenderModel and compiles it into a Base64 string.
 */
export async function generateDocumentPdfBase64(
  options: GeneratePdfOptions
): Promise<string> {
  const blob = await generateDocumentPdfBlob(options)
  return blobToBase64(blob)
}

/**
 * Builds the appropriate RenderModel and compiles it into a binary Node/Bun Buffer.
 */
export async function generateDocumentPdfBuffer({
  document,
  appTheme = "light",
  template: customTemplate,
}: GeneratePdfOptions): Promise<Buffer> {
  const blob = await generateDocumentPdfBlob({
    document,
    appTheme,
    template: customTemplate,
  })
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Compiles an existing RenderModel into a binary Node/Bun Buffer.
 */
export async function generateModelPdfBuffer({
  model,
  template,
}: GenerateModelPdfOptions): Promise<Buffer> {
  const blob = await generateModelPdfBlob({
    model,
    template,
  })
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
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
