import { Document, Page, StyleSheet, View } from "@react-pdf/renderer"
import type { DocumentTemplate } from "@workspace/document/presentation"
import type {
  InvoiceRenderModel,
  ProposalRenderModel,
} from "@workspace/document/render"
import { stripHtml } from "@workspace/document/text"
import { PdfBlockRenderer } from "./pdf-blocks"
import { resolvePdfTheme } from "./pdf-styles"

export type DocumentPdfProps = {
  model: ProposalRenderModel | InvoiceRenderModel
  template: DocumentTemplate
}

export function DocumentPdfDocument({ model, template }: DocumentPdfProps) {
  const theme = resolvePdfTheme(template)
  const isInvoice = "invoiceNumber" in model
  const cleanTitle =
    stripHtml(model.title) || (isInvoice ? "Invoice" : "Proposal")

  const styles = StyleSheet.create({
    page: {
      backgroundColor: theme.canvasBackground,
      color: theme.foreground,
      fontFamily: theme.bodyFont,
      paddingTop: 24,
      paddingBottom: 24,
      paddingHorizontal: 24,
      fontSize: 9.5,
      lineHeight: 1.4,
      flexDirection: "column",
    },
    blocksContainer: {
      flex: 1,
      flexDirection: "column",
    },
  })

  // Check if header is already in blocks
  const hasPartyHeaderBlock = model.blocks.some((b) => b.type === "partyHeader")

  return (
    <Document
      title={cleanTitle}
      author={model.seller.name || "Parliament"}
      subject={cleanTitle}
      creator="Parliament Document Suite"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.blocksContainer}>
          {/* If there was no explicit partyHeader block, inject default */}
          {!hasPartyHeaderBlock && (
            <PdfBlockRenderer
              block={{
                id: "synthetic-header",
                type: "partyHeader",
                version: 1,
                binding: isInvoice ? "invoice.parties" : "proposal.parties",
                config: { layout: "mark-left-dates-right" },
              }}
              model={model}
              theme={theme}
            />
          )}

          {model.blocks.map((block) => (
            <PdfBlockRenderer
              key={block.id}
              block={block}
              model={model}
              theme={theme}
            />
          ))}
        </View>
      </Page>
    </Document>
  )
}
