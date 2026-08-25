import { StyleSheet, Text, View } from "@react-pdf/renderer"
import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import type {
  InvoiceRenderModel,
  ProposalRenderModel,
} from "@workspace/document/render"
import type {
  DocumentBlock,
  PartySnapshot,
  RichTextNode,
} from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import { extractTextFromRichNode, PdfRichText } from "./pdf-rich-text"
import type { ResolvedPdfTheme } from "./pdf-styles"

export type PdfBlockProps = {
  block: DocumentBlock
  model: ProposalRenderModel | InvoiceRenderModel
  theme: ResolvedPdfTheme
}

export function PdfBlockRenderer({ block, model, theme }: PdfBlockProps) {
  switch (block.type) {
    case "partyHeader":
      return <PdfPartyHeader block={block} model={model} theme={theme} />
    case "pricing":
      return <PdfPricing block={block} model={model} theme={theme} />
    case "richText":
      return (
        <View style={{ marginBottom: theme.spacing.sectionMarginBottom }}>
          <PdfRichText content={block.content} theme={theme} />
        </View>
      )
    case "section":
      return <PdfSection block={block} theme={theme} />
    case "cover":
      return <PdfCover block={block} model={model} theme={theme} />
    case "columns":
      return <PdfColumns block={block} theme={theme} />
    case "imageText":
      return <PdfImageText block={block} theme={theme} />
    case "imageCards":
      return <PdfImageCards block={block} theme={theme} />
    case "signature":
      return <PdfSignature block={block} model={model} theme={theme} />
    case "timeline":
      return <PdfTimeline block={block} theme={theme} />
    case "metrics":
      return <PdfMetrics block={block} theme={theme} />
    case "team":
      return <PdfTeam block={block} theme={theme} />
    case "testimonials":
      return <PdfTestimonials block={block} theme={theme} />
    case "gallery":
      return <PdfGallery block={block} theme={theme} />
    case "faq":
      return <PdfFaq block={block} theme={theme} />
    default:
      return null
  }
}

// -----------------------------------------------------------------------------
// 1. Party Header Renderer
// -----------------------------------------------------------------------------
function PdfPartyHeader({
  block,
  model,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "partyHeader" }>
  model: ProposalRenderModel | InvoiceRenderModel
  theme: ResolvedPdfTheme
}) {
  const isInvoice = "invoiceNumber" in model
  const layout = block.config?.layout || "mark-left-dates-right"
  const cleanTitle =
    stripHtml(model.title) || (isInvoice ? "Invoice" : "Proposal")

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      padding: theme.spacing.headerPadding,
      borderRadius: theme.cardRadius,
      borderWidth: 1,
      borderColor: theme.accentBorderMix,
      backgroundColor: theme.accentTintSubtle,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    brandBadge: {
      width: 48,
      height: 26,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: theme.accentBorderMix,
      backgroundColor: theme.pageBackground,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    brandBadgeText: {
      fontFamily: theme.headingFont,
      fontSize: 8.5,
      fontWeight: "bold",
      color: theme.accent,
      letterSpacing: 1,
    },
    documentTypePill: {
      fontFamily: theme.headingFont,
      fontSize: 7.5,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    documentTitle: {
      fontFamily: theme.headingFont,
      fontSize: 22,
      fontWeight: "bold",
      color: theme.foreground,
      lineHeight: 1.15,
      maxWidth: 300,
    },
    documentSubtitle: {
      fontFamily: theme.bodyFont,
      fontSize: 8.5,
      color: theme.mutedForeground,
      marginTop: 4,
      maxWidth: 280,
      lineHeight: 1.35,
    },
    datesColumn: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    dateItem: {
      marginBottom: 6,
      alignItems: "flex-end",
    },
    dateLabel: {
      fontFamily: theme.headingFont,
      fontSize: 6.5,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 1,
    },
    dateValue: {
      fontFamily: theme.bodyFont,
      fontSize: 8.5,
      color: theme.foreground,
    },
    invoiceNumberValue: {
      fontFamily: "Courier",
      fontSize: 8.5,
      fontWeight: "bold",
      color: theme.foreground,
    },
    partiesDivider: {
      borderTopWidth: 0.75,
      borderTopColor: theme.accentBorderMix,
      marginTop: 12,
      paddingTop: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    partyColumn: {
      width: "48%",
    },
  })

  const dateItems = (
    <View style={styles.datesColumn}>
      {isInvoice && (model as InvoiceRenderModel).invoiceNumber ? (
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Invoice No</Text>
          <Text style={styles.invoiceNumberValue}>
            {(model as InvoiceRenderModel).invoiceNumber}
          </Text>
        </View>
      ) : null}

      <View style={styles.dateItem}>
        <Text style={styles.dateLabel}>
          {isInvoice ? "Date Issued" : "Date"}
        </Text>
        <Text style={styles.dateValue}>
          {formatDateOnly(model.issueDate, model.locale)}
        </Text>
      </View>

      {!isInvoice && (model as ProposalRenderModel).validUntil ? (
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Valid Until</Text>
          <Text style={styles.dateValue}>
            {formatDateOnly(
              (model as ProposalRenderModel).validUntil as string,
              model.locale
            )}
          </Text>
        </View>
      ) : null}

      {isInvoice && (model as InvoiceRenderModel).dueDate ? (
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Due Date</Text>
          <Text style={styles.dateValue}>
            {formatDateOnly(
              (model as InvoiceRenderModel).dueDate,
              model.locale
            )}
          </Text>
        </View>
      ) : null}

      {isInvoice && (model as InvoiceRenderModel).paymentTerms ? (
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Terms</Text>
          <Text style={styles.dateValue}>
            {(model as InvoiceRenderModel).paymentTerms}
          </Text>
        </View>
      ) : null}
    </View>
  )

  const sellerInitials = model.seller.name
    ? model.seller.name.slice(0, 2).toUpperCase()
    : isInvoice
      ? "INV"
      : "PR"

  return (
    <View style={styles.container} wrap={false}>
      {layout === "centered-stack" ? (
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>{sellerInitials}</Text>
          </View>
          <Text style={styles.documentTypePill}>
            {isInvoice ? "Tax Invoice" : "Proposal"}
          </Text>
          <Text style={[styles.documentTitle, { textAlign: "center" }]}>
            {cleanTitle}
          </Text>
          <View style={{ marginTop: 8 }}>{dateItems}</View>
        </View>
      ) : layout === "editorial-band" ? (
        <View>
          <View style={styles.topRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{sellerInitials}</Text>
            </View>
            {dateItems}
          </View>
          <Text style={styles.documentTypePill}>
            {isInvoice ? "Tax Invoice" : "Proposal"}
          </Text>
          <Text style={styles.documentTitle}>{cleanTitle}</Text>
        </View>
      ) : (
        <View style={styles.topRow}>
          <View>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>{sellerInitials}</Text>
            </View>
            <Text style={styles.documentTypePill}>
              {isInvoice ? "Tax Invoice" : "Proposal"}
            </Text>
            <Text style={styles.documentTitle}>{cleanTitle}</Text>
            <Text style={styles.documentSubtitle}>
              {isInvoice
                ? "Official invoice for professional services rendered."
                : "A focused plan for a clear, performant, and conversion-ready project."}
            </Text>
          </View>
          {dateItems}
        </View>
      )}

      <View style={styles.partiesDivider}>
        <View style={styles.partyColumn}>
          <PdfPartyBlock
            label={isInvoice ? "Billed By" : "Prepared By"}
            party={model.seller}
            theme={theme}
          />
        </View>
        <View style={styles.partyColumn}>
          <PdfPartyBlock
            label={isInvoice ? "Billed To" : "Prepared For"}
            party={model.customer}
            theme={theme}
          />
        </View>
      </View>
    </View>
  )
}

function PdfPartyBlock({
  label,
  party,
  theme,
}: {
  label: string
  party: PartySnapshot
  theme: ResolvedPdfTheme
}) {
  const styles = StyleSheet.create({
    container: {
      flexDirection: "column",
    },
    label: {
      fontFamily: theme.headingFont,
      fontSize: 6.5,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 3,
    },
    name: {
      fontFamily: theme.headingFont,
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 2,
    },
    text: {
      fontFamily: theme.bodyFont,
      fontSize: 8,
      color: theme.mutedForeground,
      lineHeight: 1.3,
    },
    customField: {
      fontFamily: theme.bodyFont,
      fontSize: 7.5,
      color: theme.mutedForeground,
      marginTop: 2,
    },
  })

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.name}>{party.name || "—"}</Text>
      {party.email ? <Text style={styles.text}>{party.email}</Text> : null}
      {party.phone ? <Text style={styles.text}>{party.phone}</Text> : null}
      {party.address ? (
        <Text style={styles.text}>{stripHtml(party.address)}</Text>
      ) : null}
      {party.taxId ? (
        <Text style={styles.text}>Tax ID: {party.taxId}</Text>
      ) : null}
      {(party.customFields || []).map((f) => (
        <Text key={f.id} style={styles.customField}>
          {f.label}: {f.value}
        </Text>
      ))}
    </View>
  )
}

// -----------------------------------------------------------------------------
// 2. Pricing & Invoicing Table Renderer
// -----------------------------------------------------------------------------
function PdfPricing({
  block,
  model,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "pricing" }>
  model: ProposalRenderModel | InvoiceRenderModel
  theme: ResolvedPdfTheme
}) {
  const pricing = model.pricing
  if (!pricing) return null

  const currency = pricing.currency || "USD"
  const locale = model.locale || "en-US"
  const calculation = pricing.calculation

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    titleRow: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 6,
      marginBottom: 8,
    },
    title: {
      fontFamily: theme.headingFont,
      fontSize: 8.5,
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: theme.foreground,
    },
    subtitle: {
      fontFamily: theme.bodyFont,
      fontSize: 7.5,
      color: theme.mutedForeground,
      marginTop: 2,
    },
    tableHeaderRow: {
      flexDirection: "row",
      borderBottomWidth: 0.75,
      borderBottomColor: theme.border,
      paddingVertical: 4,
      backgroundColor: theme.accentTintSubtle,
    },
    thDescription: {
      width: "50%",
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      paddingLeft: 6,
    },
    thQty: {
      width: "12%",
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      textAlign: "center",
    },
    thUnitPrice: {
      width: "18%",
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      textAlign: "right",
    },
    thAmount: {
      width: "20%",
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      textAlign: "right",
      paddingRight: 6,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
      paddingVertical: 6,
      alignItems: "flex-start",
    },
    tdDescription: {
      width: "50%",
      paddingLeft: 6,
      paddingRight: 8,
    },
    itemDescText: {
      fontFamily: theme.headingFont,
      fontSize: 8.5,
      fontWeight: "bold",
      color: theme.foreground,
    },
    itemDetailsText: {
      fontFamily: theme.bodyFont,
      fontSize: 7.5,
      color: theme.mutedForeground,
      marginTop: 2,
      lineHeight: 1.3,
    },
    tdQty: {
      width: "12%",
      fontFamily: theme.bodyFont,
      fontSize: 8.5,
      color: theme.foreground,
      textAlign: "center",
    },
    tdUnitPrice: {
      width: "18%",
      fontFamily: "Courier",
      fontSize: 8.5,
      color: theme.foreground,
      textAlign: "right",
    },
    tdAmount: {
      width: "20%",
      fontFamily: "Courier",
      fontSize: 8.5,
      fontWeight: "bold",
      color: theme.foreground,
      textAlign: "right",
      paddingRight: 6,
    },
    totalsBox: {
      alignSelf: "flex-end",
      width: 200,
      marginTop: 8,
      paddingTop: 6,
      borderTopWidth: 0.75,
      borderTopColor: theme.border,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
    },
    totalLabel: {
      fontFamily: theme.bodyFont,
      fontSize: 8,
      color: theme.mutedForeground,
    },
    totalValue: {
      fontFamily: "Courier",
      fontSize: 8,
      color: theme.foreground,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 4,
      marginTop: 3,
    },
    grandTotalLabel: {
      fontFamily: theme.headingFont,
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
    },
    grandTotalValue: {
      fontFamily: "Courier",
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
    },
    signatureContainer: {
      alignSelf: "flex-end",
      width: 180,
      marginTop: 18,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      alignItems: "flex-end",
    },
    signatureName: {
      fontFamily: "Times-Italic",
      fontSize: 16,
      color: theme.foreground,
    },
    signatureTitle: {
      fontFamily: theme.headingFont,
      fontSize: 6.5,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 2,
    },
  })

  const signerName =
    ("signerName" in pricing && pricing.signerName) ||
    model.seller.name ||
    "Authorized Signer"
  const signerTitle =
    ("signerTitle" in pricing && pricing.signerTitle) || "Signature"

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {block.config?.title || "Pricing Breakdown"}
        </Text>
        <Text style={styles.subtitle}>
          Financial specification and itemized breakdown
        </Text>
      </View>

      {/* Table Head */}
      <View style={styles.tableHeaderRow}>
        <Text style={styles.thDescription}>Description</Text>
        <Text style={styles.thQty}>Qty</Text>
        <Text style={styles.thUnitPrice}>Unit Price</Text>
        <Text style={styles.thAmount}>Amount</Text>
      </View>

      {/* Table Body */}
      {pricing.items.map((item, idx) => {
        const line = calculation?.lines?.find((l) => l.id === item.id)
        const lineAmount = line
          ? line.amountMinor
          : item.unitPriceMinor * (Number(item.quantity) || 1)
        const cleanDesc = stripHtml(item.description || "")
        const cleanDetails = stripHtml(item.details || "")

        return (
          <View key={item.id || idx} style={styles.tableRow}>
            <View style={styles.tdDescription}>
              <Text style={styles.itemDescText}>{cleanDesc}</Text>
              {cleanDetails ? (
                <Text style={styles.itemDetailsText}>{cleanDetails}</Text>
              ) : null}
            </View>
            <Text style={styles.tdQty}>{item.quantity}</Text>
            <Text style={styles.tdUnitPrice}>
              {formatMoneyMinor(item.unitPriceMinor, currency, locale)}
            </Text>
            <Text style={styles.tdAmount}>
              {formatMoneyMinor(lineAmount, currency, locale)}
            </Text>
          </View>
        )
      })}

      {/* Totals Box */}
      {calculation && (
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatMoneyMinor(calculation.subtotalMinor, currency, locale)}
            </Text>
          </View>

          {calculation.discountMinor > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: theme.accent }]}>
                -{formatMoneyMinor(calculation.discountMinor, currency, locale)}
              </Text>
            </View>
          ) : null}

          {calculation.taxMinor > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>
                {formatMoneyMinor(calculation.taxMinor, currency, locale)}
              </Text>
            </View>
          ) : null}

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatMoneyMinor(calculation.totalMinor, currency, locale)}
            </Text>
          </View>
        </View>
      )}

      {/* Signer */}
      {signerName ? (
        <View style={styles.signatureContainer}>
          <Text style={styles.signatureName}>{signerName}</Text>
          <Text style={styles.signatureTitle}>{signerTitle}</Text>
        </View>
      ) : null}
    </View>
  )
}

// -----------------------------------------------------------------------------
// 3. Section Renderer
// -----------------------------------------------------------------------------
function PdfSection({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "section" }>
  theme: ResolvedPdfTheme
}) {
  const variant = block.variant || "default"
  const isAccent = variant === "accent"
  const isCompact = variant === "compact"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      ...(isAccent
        ? {
            padding: theme.spacing.headerPadding,
            borderRadius: theme.cardRadius,
            borderWidth: 1,
            borderColor: theme.accentBorderMix,
            backgroundColor: theme.accentTintSubtle,
          }
        : isCompact
          ? {
              borderTopWidth: 0.75,
              borderTopColor: theme.border,
              paddingTop: 10,
            }
          : {}),
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow={block.eyebrow}
        title={block.title}
        lead={block.lead}
        theme={theme}
      />
      <View style={{ marginTop: 6 }}>
        <PdfRichText content={block.content} theme={theme} />
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 4. Cover Renderer
// -----------------------------------------------------------------------------
function PdfCover({
  block,
  model,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "cover" }>
  model: ProposalRenderModel | InvoiceRenderModel
  theme: ResolvedPdfTheme
}) {
  const variant = block.variant || "split"
  const isSplit = variant !== "minimal"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      padding: theme.spacing.headerPadding,
      borderRadius: theme.cardRadius,
      borderWidth: 1,
      borderColor: theme.accentBorderMix,
      backgroundColor: theme.accentTintSubtle,
    },
    splitRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "stretch",
    },
    leftContent: {
      width: isSplit ? "58%" : "100%",
    },
    visualBox: {
      width: "38%",
      borderRadius: theme.radius,
      backgroundColor: theme.accentTintMedium,
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
      minHeight: 120,
    },
    visualText: {
      fontFamily: theme.headingFont,
      fontSize: 8,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    partiesRow: {
      borderTopWidth: 0.75,
      borderTopColor: theme.accentBorderMix,
      marginTop: 10,
      paddingTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <View style={isSplit ? styles.splitRow : undefined}>
        <View style={styles.leftContent}>
          <PdfSectionHeading
            eyebrow={block.eyebrow}
            title={block.title}
            lead={block.subtitle}
            theme={theme}
          />
          <View style={styles.partiesRow}>
            <View style={{ width: "48%" }}>
              <PdfPartyBlock
                label="Prepared By"
                party={model.seller}
                theme={theme}
              />
            </View>
            <View style={{ width: "48%" }}>
              <PdfPartyBlock
                label="Prepared For"
                party={model.customer}
                theme={theme}
              />
            </View>
          </View>
        </View>
        {isSplit ? (
          <View style={styles.visualBox}>
            <Text style={styles.visualText}>
              {block.media?.alt || "Cover Visual"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 5. Columns Narrative Renderer
// -----------------------------------------------------------------------------
function PdfColumns({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "columns" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 2
  const colWidth = colCount === 3 ? "31%" : "48%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 8,
    },
    colItem: {
      width: colWidth,
      borderTopWidth: 0.75,
      borderTopColor: theme.border,
      paddingTop: 6,
      marginBottom: 8,
    },
    colHeading: {
      fontFamily: theme.headingFont,
      fontSize: 10,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 3,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading title={block.title} theme={theme} />
      <View style={styles.grid}>
        {block.items.map((item) => (
          <View key={item.id} style={styles.colItem}>
            <Text style={styles.colHeading}>
              <PdfRichText content={item.heading} theme={theme} inline />
            </Text>
            <PdfRichText
              content={item.body}
              theme={theme}
              defaultColor={theme.mutedForeground}
              defaultFontSize={8.5}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 6. ImageText Renderer
// -----------------------------------------------------------------------------
function PdfImageText({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "imageText" }>
  theme: ResolvedPdfTheme
}) {
  const isReverse = block.reverse === true

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      flexDirection: isReverse ? "row-reverse" : "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    visualBox: {
      width: "44%",
      minHeight: 120,
      borderRadius: theme.radius,
      backgroundColor: theme.accentTintMedium,
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
    },
    visualText: {
      fontFamily: theme.headingFont,
      fontSize: 8,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    contentBox: {
      width: "52%",
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.visualBox}>
        <Text style={styles.visualText}>{block.image?.alt || "Image"}</Text>
      </View>
      <View style={styles.contentBox}>
        <PdfSectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          theme={theme}
        />
        <View style={{ marginTop: 6 }}>
          <PdfRichText content={block.content} theme={theme} />
        </View>
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 7. ImageCards Renderer
// -----------------------------------------------------------------------------
function PdfImageCards({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "imageCards" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 3
  const isHorizontal = block.variant === "horizontal"
  const colWidth = colCount === 1 ? "100%" : colCount === 2 ? "48%" : "31%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    card: {
      width: colWidth,
      borderRadius: theme.radius,
      borderWidth: 0.75,
      borderColor: theme.border,
      padding: 8,
      marginBottom: 8,
      backgroundColor: theme.pageBackground,
    },
    imagePlaceholder: {
      height: isHorizontal ? 50 : 70,
      borderRadius: theme.radius,
      backgroundColor: theme.accentTintMedium,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    imageText: {
      fontFamily: theme.headingFont,
      fontSize: 7.5,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
    },
    cardTitle: {
      fontFamily: theme.headingFont,
      fontSize: 9,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 2,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      {block.items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>{item.image?.alt || "Visual"}</Text>
          </View>
          <Text style={styles.cardTitle}>
            <PdfRichText content={item.title} theme={theme} inline />
          </Text>
          <PdfRichText
            content={item.body}
            theme={theme}
            defaultColor={theme.mutedForeground}
            defaultFontSize={8}
          />
        </View>
      ))}
    </View>
  )
}

// -----------------------------------------------------------------------------
// 8. Metrics / Outcomes Renderer
// -----------------------------------------------------------------------------
function PdfMetrics({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "metrics" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 3
  const colWidth = colCount === 1 ? "100%" : colCount === 2 ? "48%" : "31%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 8,
    },
    metricBox: {
      width: colWidth,
      alignItems: "center",
      textAlign: "center",
      padding: 8,
      marginBottom: 8,
    },
    value: {
      fontFamily: theme.headingFont,
      fontSize: 22,
      fontWeight: "bold",
      color: theme.accent,
      marginBottom: 2,
    },
    label: {
      fontFamily: theme.headingFont,
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 2,
      textAlign: "center",
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow="Outcomes"
        title="What success will look like"
        theme={theme}
      />
      <View style={styles.grid}>
        {block.items.map((item) => (
          <View key={item.id} style={styles.metricBox}>
            <Text style={styles.value}>
              <PdfRichText content={item.value} theme={theme} inline />
            </Text>
            <Text style={styles.label}>
              <PdfRichText content={item.label} theme={theme} inline />
            </Text>
            <PdfRichText
              content={item.detail}
              theme={theme}
              defaultColor={theme.mutedForeground}
              defaultFontSize={8}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 9. Team Renderer
// -----------------------------------------------------------------------------
function PdfTeam({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "team" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 3
  const colWidth = colCount === 1 ? "100%" : colCount === 2 ? "48%" : "31%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 8,
    },
    teamBox: {
      width: colWidth,
      alignItems: "center",
      textAlign: "center",
      padding: 8,
      marginBottom: 8,
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.accentTintMedium,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    avatarText: {
      fontFamily: theme.headingFont,
      fontSize: 12,
      fontWeight: "bold",
      color: theme.accent,
    },
    name: {
      fontFamily: theme.headingFont,
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 1,
    },
    role: {
      fontFamily: theme.bodyFont,
      fontSize: 8,
      color: theme.mutedForeground,
      marginBottom: 4,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow="Team"
        title="Who will lead the work"
        theme={theme}
      />
      <View style={styles.grid}>
        {block.items.map((item) => {
          const nameStr = extractTextFromRichNode(item.name) || "T"
          const initial = nameStr.slice(0, 1).toUpperCase()
          return (
            <View key={item.id} style={styles.teamBox}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <Text style={styles.name}>
                <PdfRichText content={item.name} theme={theme} inline />
              </Text>
              <Text style={styles.role}>
                <PdfRichText content={item.role} theme={theme} inline />
              </Text>
              <PdfRichText
                content={item.bio}
                theme={theme}
                defaultColor={theme.mutedForeground}
                defaultFontSize={7.5}
              />
            </View>
          )
        })}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 10. Testimonials Renderer
// -----------------------------------------------------------------------------
function PdfTestimonials({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "testimonials" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 3
  const colWidth = colCount === 1 ? "100%" : colCount === 2 ? "48%" : "31%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 8,
    },
    itemBox: {
      width: colWidth,
      borderLeftWidth: 2,
      borderLeftColor: theme.accent,
      paddingLeft: 8,
      paddingVertical: 4,
      marginBottom: 8,
    },
    author: {
      fontFamily: theme.headingFont,
      fontSize: 8.5,
      fontWeight: "bold",
      color: theme.foreground,
      marginTop: 4,
    },
    role: {
      fontFamily: theme.bodyFont,
      fontSize: 7.5,
      color: theme.mutedForeground,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow="Proof"
        title="Relevant client confidence"
        theme={theme}
      />
      <View style={styles.grid}>
        {block.items.map((item) => (
          <View key={item.id} style={styles.itemBox}>
            <PdfRichText
              content={item.quote}
              theme={theme}
              defaultColor={theme.mutedForeground}
              defaultFontSize={8.5}
            />
            <Text style={styles.author}>
              <PdfRichText content={item.author} theme={theme} inline />
            </Text>
            <Text style={styles.role}>
              <PdfRichText content={item.role} theme={theme} inline />
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 11. Timeline Renderer
// -----------------------------------------------------------------------------
function PdfTimeline({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "timeline" }>
  theme: ResolvedPdfTheme
}) {
  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      borderLeftWidth: 1.5,
      borderLeftColor: theme.border,
      paddingLeft: 12,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow="Project Plan"
        title="How the work unfolds"
        theme={theme}
      />
      <View style={{ marginTop: 6 }}>
        <PdfRichText content={block.content} theme={theme} />
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 12. Gallery Renderer
// -----------------------------------------------------------------------------
function PdfGallery({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "gallery" }>
  theme: ResolvedPdfTheme
}) {
  const colCount = block.columns || 3
  const colWidth = colCount === 1 ? "100%" : colCount === 2 ? "48%" : "31%"

  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    tile: {
      width: colWidth,
      height: 70,
      borderRadius: theme.radius,
      backgroundColor: theme.accentTintMedium,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    tileText: {
      fontFamily: theme.headingFont,
      fontSize: 7.5,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      {block.images.map((image) => (
        <View key={image.id} style={styles.tile}>
          <Text style={styles.tileText}>{image.alt || "Image"}</Text>
        </View>
      ))}
    </View>
  )
}

// -----------------------------------------------------------------------------
// 13. FAQ Renderer
// -----------------------------------------------------------------------------
function PdfFaq({
  block,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "faq" }>
  theme: ResolvedPdfTheme
}) {
  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
    },
    faqItem: {
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
      paddingVertical: 6,
    },
    question: {
      fontFamily: theme.headingFont,
      fontSize: 9.5,
      fontWeight: "bold",
      color: theme.foreground,
      marginBottom: 3,
    },
  })

  return (
    <View style={styles.container} wrap={false}>
      <PdfSectionHeading
        eyebrow="FAQ"
        title="Frequently Asked Questions"
        theme={theme}
      />
      <View style={{ marginTop: 6 }}>
        {block.items.map((item) => (
          <View key={item.id} style={styles.faqItem}>
            <Text style={styles.question}>
              <PdfRichText content={item.question} theme={theme} inline />
            </Text>
            <PdfRichText
              content={item.answer}
              theme={theme}
              defaultColor={theme.mutedForeground}
              defaultFontSize={8}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// 14. Signature Block Renderer
// -----------------------------------------------------------------------------
function PdfSignature({
  block,
  model,
  theme,
}: {
  block: Extract<DocumentBlock, { type: "signature" }>
  model: ProposalRenderModel | InvoiceRenderModel
  theme: ResolvedPdfTheme
}) {
  const styles = StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sectionMarginBottom,
      borderTopWidth: 0.75,
      borderTopColor: theme.border,
      paddingTop: 10,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    termsBox: {
      width: "58%",
    },
    signBox: {
      width: "38%",
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      alignItems: "flex-end",
      alignSelf: "flex-end",
    },
    signerName: {
      fontFamily: "Times-Italic",
      fontSize: 18,
      color: theme.foreground,
    },
    signerTitle: {
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 2,
    },
  })

  const signerName =
    (model.pricing &&
      "signerName" in model.pricing &&
      model.pricing.signerName) ||
    model.seller.name ||
    "Authorized Signer"
  const signerTitle =
    (model.pricing &&
      "signerTitle" in model.pricing &&
      model.pricing.signerTitle) ||
    "Signature"

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.termsBox}>
        <PdfSectionHeading title={block.title} theme={theme} />
        <View style={{ marginTop: 4 }}>
          <PdfRichText
            content={block.terms}
            theme={theme}
            defaultColor={theme.mutedForeground}
            defaultFontSize={8}
          />
        </View>
      </View>
      <View style={styles.signBox}>
        <Text style={styles.signerName}>{signerName}</Text>
        <Text style={styles.signerTitle}>{signerTitle}</Text>
      </View>
    </View>
  )
}

// -----------------------------------------------------------------------------
// Helper: Section Heading
// -----------------------------------------------------------------------------
function PdfSectionHeading({
  eyebrow,
  title,
  lead,
  theme,
}: {
  eyebrow?: RichTextNode | string
  title: RichTextNode | string
  lead?: RichTextNode | string
  theme: ResolvedPdfTheme
}) {
  const styles = StyleSheet.create({
    container: {
      marginBottom: 4,
    },
    eyebrow: {
      fontFamily: theme.headingFont,
      fontSize: 7,
      fontWeight: "bold",
      color: theme.accent,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    title: {
      fontFamily: theme.headingFont,
      fontSize: 14,
      fontWeight: "bold",
      color: theme.foreground,
      lineHeight: 1.25,
    },
    lead: {
      fontFamily: theme.bodyFont,
      fontSize: 8.5,
      color: theme.mutedForeground,
      marginTop: 3,
      lineHeight: 1.35,
    },
  })

  const hasEyebrow = Boolean(
    typeof eyebrow === "string"
      ? eyebrow
      : eyebrow?.text || (eyebrow?.content && eyebrow.content.length > 0)
  )
  const hasLead = Boolean(
    typeof lead === "string"
      ? lead
      : lead?.text || (lead?.content && lead.content.length > 0)
  )

  return (
    <View style={styles.container}>
      {hasEyebrow ? (
        <Text style={styles.eyebrow}>
          <PdfRichText content={eyebrow} theme={theme} inline />
        </Text>
      ) : null}
      <Text style={styles.title}>
        <PdfRichText content={title} theme={theme} inline />
      </Text>
      {hasLead ? (
        <Text style={styles.lead}>
          <PdfRichText content={lead} theme={theme} inline />
        </Text>
      ) : null}
    </View>
  )
}
