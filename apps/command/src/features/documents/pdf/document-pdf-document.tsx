import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
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
      backgroundColor: theme.pageBackground,
      color: theme.foreground,
      fontFamily: theme.bodyFont,
      paddingTop: 36,
      paddingBottom: 44,
      paddingHorizontal: 40,
      fontSize: 9.5,
      lineHeight: 1.4,
      flexDirection: "column",
    },
    blocksContainer: {
      flex: 1,
      flexDirection: "column",
    },
    pageFooter: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
      paddingTop: 6,
    },
    footerBrand: {
      fontFamily: theme.headingFont,
      fontSize: 7.5,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    footerPagination: {
      fontFamily: theme.bodyFont,
      fontSize: 7.5,
      color: theme.mutedForeground,
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
                config: { layout: "editorial-band" },
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

        {/* Running Page Footer with dynamic page numbering */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerBrand}>
            {model.seller.name || cleanTitle}
          </Text>
          <Text
            style={styles.footerPagination}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
