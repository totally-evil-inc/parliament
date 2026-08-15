import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import type { DocumentTemplate } from "@workspace/document/presentation"
import { getDocumentTemplateStyle } from "@workspace/document/presentation"
import type {
  InvoiceRenderModel,
  ProposalRenderModel,
} from "@workspace/document/render"
import type { DocumentBlock, PartySnapshot } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"
import type * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { RichTextHtml, RichTextInlineHtml } from "./rich-text-html"

export type DocumentHtmlModel = ProposalRenderModel | InvoiceRenderModel

export type DocumentHtmlViewProps = {
  model: DocumentHtmlModel
  template: DocumentTemplate
  className?: string
}

export function isInvoiceRenderModel(
  model: DocumentHtmlModel
): model is InvoiceRenderModel {
  return "invoiceNumber" in model
}

export function DocumentHtmlView({
  model,
  template,
  className,
}: DocumentHtmlViewProps) {
  const isInvoice = isInvoiceRenderModel(model)
  const templateStyle = getDocumentTemplateStyle(template)

  return (
    <main
      className={`document-print-canvas min-h-screen bg-[var(--document-canvas-background)] p-4 text-[var(--document-foreground)] sm:p-8 print:bg-transparent print:p-0 ${className || ""}`}
      style={templateStyle as React.CSSProperties}
      data-document-template={`${model.template.id}@${model.template.version}`}
      data-document-type={isInvoice ? "invoice" : "proposal"}
    >
      <article className="document-print-page mx-auto w-[210mm] max-w-[210mm] space-y-6 [font-family:var(--document-font-family)] print:w-full print:max-w-none print:space-y-6">
        {model.blocks.map((block) => {
          return (
            <DocumentBlockHtml key={block.id} block={block} model={model} />
          )
        })}
      </article>
    </main>
  )
}

function DocumentBlockHtml({
  block,
  model,
}: {
  block: DocumentBlock
  model: DocumentHtmlModel
}) {
  switch (block.type) {
    case "partyHeader":
      return <Header model={model} />
    case "pricing":
      return <Pricing block={block} model={model} />
    case "richText":
      return (
        <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
          <RichTextHtml
            className="typeset max-w-none"
            content={block.content}
          />
        </section>
      )
    case "section":
      return <ProposalSection block={block} />
    case "cover":
      return <Cover block={block} model={model} />
    case "columns":
      return <Columns block={block} />
    case "imageText":
      return <ImageText block={block} />
    case "imageCards":
      return <ImageCards block={block} />
    case "signature":
      return <Signature block={block} model={model} />
    case "timeline":
      return (
        <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
          <SectionHeading eyebrow="Project Plan" title="How the work unfolds" />
          <div className="mt-6 border-[var(--document-border)] border-l pl-6">
            <RichTextHtml content={block.content} />
          </div>
        </section>
      )
    case "metrics":
      return <Metrics block={block} />
    case "team":
      return <Team block={block} />
    case "testimonials":
      return <Testimonials block={block} />
    case "gallery":
      return (
        <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
          <div className={`grid gap-4 ${columns(block.columns)}`}>
            {block.images.map((image) => (
              <div
                key={image.id}
                className="flex aspect-square items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[var(--document-muted-foreground)] text-xs"
              >
                {image.alt || "Image"}
              </div>
            ))}
          </div>
        </section>
      )
    case "faq":
      return <Faq block={block} />
    default:
      return null
  }
}

function Header({ model }: { model: DocumentHtmlModel }) {
  const isInvoice = isInvoiceRenderModel(model)
  const badgeText = isInvoice ? "INVOICE" : "PROPOSAL"
  const cleanTitle =
    stripHtml(model.title) || (isInvoice ? "Invoice" : "Proposal")
  const initials = model.seller.name
    ? model.seller.name.trim().slice(0, 2).toUpperCase()
    : "TH"

  return (
    <header className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      {/* Top row: Monogram pill on left, Dates on right */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex h-9 w-16 items-center justify-center rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] font-bold text-[var(--document-foreground)] text-xs tracking-widest">
          {initials}
        </div>

        <div className="flex flex-col items-end gap-3 text-right">
          {isInvoice && model.invoiceNumber ? (
            <div>
              <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
                INVOICE NO
              </span>
              <span className="font-medium font-mono text-[var(--document-foreground)] text-sm">
                {model.invoiceNumber}
              </span>
            </div>
          ) : null}

          <div>
            <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
              DATE
            </span>
            <span className="font-medium text-[var(--document-foreground)] text-sm">
              {formatDateOnly(model.issueDate, model.locale)}
            </span>
          </div>

          {isInvoice ? (
            model.dueDate ? (
              <div>
                <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
                  DUE DATE
                </span>
                <span className="font-medium text-[var(--document-foreground)] text-sm">
                  {formatDateOnly(model.dueDate, model.locale)}
                </span>
              </div>
            ) : null
          ) : model.validUntil ? (
            <div>
              <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
                VALID UNTIL
              </span>
              <span className="font-medium text-[var(--document-foreground)] text-sm">
                {formatDateOnly(model.validUntil, model.locale)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Eyebrow & Title */}
      <div className="mt-6">
        <span className="mb-2 block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
          {badgeText}
        </span>
        <h1
          className="font-bold text-3xl text-[var(--document-foreground)] leading-tight tracking-tight [font-family:var(--document-heading-font-family)] sm:text-4xl"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized title
          dangerouslySetInnerHTML={{ __html: cleanTitle }}
        />
      </div>

      {/* Divider & Parties */}
      <div className="mt-8 border-[var(--document-border)] border-t pt-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <PartyInfo
            label={isInvoice ? "BILLED BY" : "PREPARED BY"}
            party={model.seller}
          />
          <PartyInfo
            label={isInvoice ? "BILLED TO" : "PREPARED FOR"}
            party={model.customer}
          />
        </div>
      </div>
    </header>
  )
}

function PartyInfo({ label, party }: { label: string; party: PartySnapshot }) {
  return (
    <div className="space-y-1 text-sm">
      <span className="mb-2 block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
        {label}
      </span>
      <p className="font-semibold text-[var(--document-foreground)] text-base">
        {party.name || "—"}
      </p>
      {party.email && (
        <p className="text-[var(--document-muted-foreground)] text-sm">
          {party.email}
        </p>
      )}
      {party.phone && (
        <p className="text-[var(--document-muted-foreground)] text-sm">
          {party.phone}
        </p>
      )}
      {party.address && (
        <p className="whitespace-pre-line text-[var(--document-muted-foreground)] text-sm">
          {party.address}
        </p>
      )}
      {party.taxId && (
        <p className="text-[var(--document-muted-foreground)] text-xs">
          Tax ID: {party.taxId}
        </p>
      )}
      {party.customFields?.map((field) => (
        <p
          key={field.id}
          className="text-[var(--document-muted-foreground)] text-xs"
        >
          <strong className="text-[var(--document-foreground)]">
            {field.label}:
          </strong>{" "}
          {field.value}
        </p>
      ))}
    </div>
  )
}

function Cover({
  block,
}: {
  block: Extract<DocumentBlock, { type: "cover" }>
  model: DocumentHtmlModel
}) {
  const isMinimal = block.variant === "minimal"

  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className="space-y-4">
        {block.eyebrow ? (
          <div className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
            <RichTextInlineHtml content={block.eyebrow} />
          </div>
        ) : null}

        <h1 className="font-bold text-3xl text-[var(--document-foreground)] leading-tight tracking-tight [font-family:var(--document-heading-font-family)] sm:text-4xl">
          <RichTextInlineHtml content={block.title} />
        </h1>

        {block.subtitle ? (
          <div className="text-[var(--document-muted-foreground)] text-base leading-relaxed">
            <RichTextInlineHtml content={block.subtitle} />
          </div>
        ) : null}
      </div>

      {!isMinimal && (
        <div className="mt-8 flex aspect-video items-center justify-center rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] font-medium text-[var(--document-muted-foreground)] text-sm">
          Document Visual
        </div>
      )}
    </section>
  )
}

function ProposalSection({
  block,
}: {
  block: Extract<DocumentBlock, { type: "section" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      {block.eyebrow ? (
        <div className="mb-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
          <RichTextInlineHtml content={block.eyebrow} />
        </div>
      ) : null}

      <h2 className="font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
        <RichTextInlineHtml content={block.title} />
      </h2>

      {block.lead ? (
        <div className="mt-2 font-medium text-[var(--document-foreground)] text-base leading-relaxed">
          <RichTextInlineHtml content={block.lead} />
        </div>
      ) : null}

      <div className="mt-6">
        <RichTextHtml className="typeset max-w-none" content={block.content} />
      </div>
    </section>
  )
}

function Columns({
  block,
}: {
  block: Extract<DocumentBlock, { type: "columns" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      {block.title ? (
        <h2 className="mb-6 font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
          <RichTextInlineHtml content={block.title} />
        </h2>
      ) : null}

      <div className={`grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-5"
          >
            <h3 className="font-semibold text-[var(--document-foreground)] text-base">
              <RichTextInlineHtml content={item.heading} />
            </h3>
            <div className="mt-2 text-[var(--document-muted-foreground)] text-sm leading-relaxed">
              <RichTextHtml content={item.body} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ImageText({
  block,
}: {
  block: Extract<DocumentBlock, { type: "imageText" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div
        className={`grid gap-8 md:grid-cols-2 ${
          block.reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="flex aspect-video items-center justify-center rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] text-[var(--document-muted-foreground)] text-sm">
          Image Asset
        </div>
        <div className="flex flex-col justify-center">
          {block.eyebrow ? (
            <div className="mb-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
              <RichTextInlineHtml content={block.eyebrow} />
            </div>
          ) : null}
          <h2 className="font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
            <RichTextInlineHtml content={block.title} />
          </h2>
          <div className="mt-4 text-[var(--document-muted-foreground)] text-sm leading-relaxed">
            <RichTextHtml content={block.content} />
          </div>
        </div>
      </div>
    </section>
  )
}

function ImageCards({
  block,
}: {
  block: Extract<DocumentBlock, { type: "imageCards" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className={`grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)]"
          >
            <div className="flex aspect-video items-center justify-center border-[var(--document-border)] border-b bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] text-[var(--document-muted-foreground)] text-xs">
              Card Image
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-[var(--document-foreground)] text-base">
                <RichTextInlineHtml content={item.title} />
              </h3>
              <div className="mt-2 text-[var(--document-muted-foreground)] text-sm leading-relaxed">
                <RichTextHtml content={item.body} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Metrics({
  block,
}: {
  block: Extract<DocumentBlock, { type: "metrics" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className={`grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-6 text-center"
          >
            <p className="font-bold text-3xl text-[var(--document-foreground)] tracking-tight">
              <RichTextInlineHtml content={item.value} />
            </p>
            <p className="mt-2 font-semibold text-[var(--document-foreground)] text-sm">
              <RichTextInlineHtml content={item.label} />
            </p>
            {item.detail ? (
              <p className="mt-1 text-[var(--document-muted-foreground)] text-xs">
                <RichTextInlineHtml content={item.detail} />
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function Team({ block }: { block: Extract<DocumentBlock, { type: "team" }> }) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className={`grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_12%,transparent)] font-bold text-[var(--document-accent)] text-sm">
              T
            </div>
            <div>
              <h3 className="font-semibold text-[var(--document-foreground)] text-base">
                <RichTextInlineHtml content={item.name} />
              </h3>
              <p className="font-medium text-[var(--document-muted-foreground)] text-xs">
                <RichTextInlineHtml content={item.role} />
              </p>
              {item.bio ? (
                <p className="mt-2 text-[var(--document-muted-foreground)] text-xs leading-relaxed">
                  <RichTextInlineHtml content={item.bio} />
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Testimonials({
  block,
}: {
  block: Extract<DocumentBlock, { type: "testimonials" }>
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className={`grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-6"
          >
            <blockquote className="text-[var(--document-foreground)] text-sm italic leading-relaxed">
              “<RichTextInlineHtml content={item.quote} />”
            </blockquote>
            <div className="mt-4 border-[var(--document-border)] border-t pt-3">
              <p className="font-semibold text-[var(--document-foreground)] text-sm">
                <RichTextInlineHtml content={item.author} />
              </p>
              <p className="text-[var(--document-muted-foreground)] text-xs">
                <RichTextInlineHtml content={item.role} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Faq({ block }: { block: Extract<DocumentBlock, { type: "faq" }> }) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <h2 className="mb-6 font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {block.items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-5"
          >
            <h3 className="font-semibold text-[var(--document-foreground)] text-base">
              <RichTextInlineHtml content={item.question} />
            </h3>
            <div className="mt-2 text-[var(--document-muted-foreground)] text-sm leading-relaxed">
              <RichTextHtml content={item.answer} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing({
  block,
  model,
}: {
  block: Extract<DocumentBlock, { type: "pricing" }>
  model: DocumentHtmlModel
}) {
  const isInvoice = isInvoiceRenderModel(model)
  const pricing = model.pricing
  if (!pricing) return null

  const calculation = pricing.calculation

  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <div className="mb-6">
        <h2 className="font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
          {block.config?.title || (isInvoice ? "Invoice Items" : "Investment")}
        </h2>
        <p className="mt-1 text-[var(--document-muted-foreground)] text-xs">
          {isInvoice
            ? "Itemized billing calculation"
            : "Indicative proposal pricing"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-[var(--document-border)] border-b font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
              <th className="pr-4 pb-3">Item & Description</th>
              <th className="px-4 pb-3 text-right">Qty</th>
              <th className="px-4 pb-3 text-right">Rate</th>
              <th className="pb-3 pl-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--document-border)]">
            {pricing.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-4 pr-4">
                  <p className="font-medium text-[var(--document-foreground)]">
                    {item.description || "Untitled Item"}
                  </p>
                  {item.showDetails && item.details && (
                    <p className="mt-1 whitespace-pre-line text-[var(--document-muted-foreground)] text-xs">
                      {item.details}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-right text-[var(--document-muted-foreground)]">
                  {item.quantity}
                </td>
                <td className="px-4 py-4 text-right text-[var(--document-muted-foreground)]">
                  {formatMoneyMinor(
                    item.unitPriceMinor,
                    pricing.currency,
                    model.locale
                  )}
                </td>
                <td className="py-4 pl-4 text-right font-medium text-[var(--document-foreground)]">
                  {formatMoneyMinor(
                    Math.round(
                      (Number(item.quantity) || 0) * item.unitPriceMinor
                    ),
                    pricing.currency,
                    model.locale
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Breakdown */}
      <div className="mt-6 flex justify-end border-[var(--document-border)] border-t pt-6">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between text-[var(--document-muted-foreground)]">
            <span>Subtotal</span>
            <span>
              {formatMoneyMinor(
                calculation.subtotalMinor,
                pricing.currency,
                model.locale
              )}
            </span>
          </div>

          {calculation.discountMinor ? (
            <div className="flex justify-between text-emerald-500">
              <span>Discount</span>
              <span>
                -
                {formatMoneyMinor(
                  calculation.discountMinor,
                  pricing.currency,
                  model.locale
                )}
              </span>
            </div>
          ) : null}

          {calculation.taxMinor ? (
            <div className="flex justify-between text-[var(--document-muted-foreground)]">
              <span>Tax</span>
              <span>
                {formatMoneyMinor(
                  calculation.taxMinor,
                  pricing.currency,
                  model.locale
                )}
              </span>
            </div>
          ) : null}

          <div className="flex justify-between border-[var(--document-border)] border-t pt-2 font-bold text-[var(--document-foreground)] text-base">
            <span>Total</span>
            <span>
              {formatMoneyMinor(
                calculation.totalMinor,
                pricing.currency,
                model.locale
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Terms or Signature */}
      {isInvoice ? (
        model.paymentTerms ? (
          <div className="mt-8 rounded-xl border border-[var(--document-border)] bg-[var(--document-canvas-background)] p-4 text-[var(--document-muted-foreground)] text-xs">
            <strong className="text-[var(--document-foreground)]">
              Payment Terms:{" "}
            </strong>
            {model.paymentTerms}
          </div>
        ) : null
      ) : (
        <div className="mt-10 flex justify-end">
          <div className="w-64 border-[var(--document-border)] border-t pt-4 text-right">
            <p className="font-[cursive] text-2xl text-[var(--document-foreground)] leading-none">
              {(!isInvoice && "signerName" in pricing && pricing.signerName) ||
                model.seller.name ||
                "Signer name"}
            </p>
            <p className="mt-1 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
              {(!isInvoice &&
                "signerTitle" in pricing &&
                pricing.signerTitle) ||
                "Authorized Signature"}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function Signature({
  block,
  model,
}: {
  block: Extract<DocumentBlock, { type: "signature" }>
  model: DocumentHtmlModel
}) {
  return (
    <section className="rounded-2xl border border-[var(--document-border)] bg-[var(--document-page-background)] p-8 text-[var(--document-foreground)] sm:p-10">
      <h2 className="font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
        <RichTextInlineHtml content={block.title} />
      </h2>
      {block.terms ? (
        <div className="mt-4 text-[var(--document-muted-foreground)] text-sm leading-relaxed">
          <RichTextHtml content={block.terms} />
        </div>
      ) : null}
      <div className="mt-8 border-[var(--document-border)] border-t pt-6">
        <div className="flex justify-between text-xs">
          <div>
            <p className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
              CLIENT ACCEPTANCE
            </p>
            <p className="mt-1 text-[var(--document-foreground)]">
              {model.customer.name || "Customer Representative"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
              DATE
            </p>
            <p className="mt-1 text-[var(--document-foreground)]">
              {formatDateOnly(model.issueDate, model.locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow?: string
  title: string
}) {
  return (
    <div>
      {eyebrow ? (
        <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-1 font-bold text-2xl text-[var(--document-foreground)] tracking-tight [font-family:var(--document-heading-font-family)]">
        {title}
      </h2>
    </div>
  )
}

function columns(cols: number): string {
  switch (cols) {
    case 1:
      return "grid-cols-1"
    case 2:
      return "grid-cols-1 md:grid-cols-2"
    case 3:
      return "grid-cols-1 md:grid-cols-3"
    case 4:
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
    default:
      return "grid-cols-1 md:grid-cols-2"
  }
}

export function renderDocumentHtmlDocument({
  model,
  template,
  title,
}: {
  model: DocumentHtmlModel
  template: DocumentTemplate
  title?: string
}): string {
  const isInvoice = isInvoiceRenderModel(model)
  const docTitle =
    title ||
    stripHtml(model.title) ||
    (isInvoice ? "Invoice Document" : "Proposal Document")
  const templateStyle = getDocumentTemplateStyle(template)
  const cssVars = Object.entries(templateStyle)
    .map(([key, value]) => `    ${key}: ${value};`)
    .join("\n")

  const appMarkup = renderToStaticMarkup(
    <DocumentHtmlView model={model} template={template} />
  )

  return `<!DOCTYPE html>
<html lang="${model.locale || "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    :root {
${cssVars}
    }

    @page {
      size: 210mm auto;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 210mm;
      min-height: 100%;
      margin: 0 auto;
      padding: 0;
      background: var(--document-canvas-background);
      color: var(--document-foreground);
      font-family: var(--document-font-family);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .document-print-canvas {
      width: 210mm;
      min-height: 100%;
      background: var(--document-canvas-background);
      padding: 16mm 14mm;
      color: var(--document-foreground);
    }

    .document-print-page {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Tailwind-compatible Utility Classes for PDF Render Engine */
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .justify-center { justify-content: center; }

    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }

    @media (min-width: 768px) {
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }

    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }

    .border { border-width: 1px; border-style: solid; }
    .border-t { border-top-width: 1px; border-top-style: solid; }
    .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .border-l { border-left-width: 1px; border-left-style: solid; }
    .border-\\[var\\(--document-border\\)\\] { border-color: var(--document-border); }

    .bg-\\[var\\(--document-canvas-background\\)\\] { background-color: var(--document-canvas-background); }
    .bg-\\[var\\(--document-page-background\\)\\] { background-color: var(--document-page-background); }

    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .p-10 { padding: 2.5rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .pt-2 { padding-top: 0.5rem; }
    .pt-4 { padding-top: 1rem; }
    .pt-6 { padding-top: 1.5rem; }
    .pt-8 { padding-top: 2rem; }
    .pb-3 { padding-bottom: 0.75rem; }
    .pl-4 { padding-left: 1rem; }
    .pl-6 { padding-left: 1.5rem; }
    .pr-4 { padding-right: 1rem; }

    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .mt-10 { margin-top: 2.5rem; }

    .w-full { width: 100%; }
    .w-16 { width: 4rem; }
    .w-64 { width: 16rem; }
    .w-72 { width: 18rem; }
    .h-9 { height: 2.25rem; }
    .h-12 { height: 3rem; }
    .w-12 { width: 3rem; }
    .shrink-0 { flex-shrink: 0; }
    .aspect-video { aspect-ratio: 16 / 9; }
    .aspect-square { aspect-ratio: 1 / 1; }

    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-\\[10px\\] { font-size: 10px; }

    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: var(--document-mono-font-family, monospace); }

    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .tracking-tight { letter-spacing: -0.025em; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    .leading-none { line-height: 1; }

    .text-\\[var\\(--document-foreground\\)\\] { color: var(--document-foreground); }
    .text-\\[var\\(--document-muted-foreground\\)\\] { color: var(--document-muted-foreground); }
    .text-emerald-500 { color: #10b981; }

    .overflow-x-auto { overflow-x: auto; }
    .whitespace-pre-line { white-space: pre-line; }
    .italic { font-style: italic; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    .divide-y > * + * { border-top-width: 1px; border-top-style: solid; border-top-color: var(--document-border); }

    /* Prose / Rich text */
    .typeset p { margin-bottom: 0.75rem; line-height: 1.6; }
    .typeset p:last-child { margin-bottom: 0; }
    .typeset h1, .typeset h2, .typeset h3 { margin-top: 1rem; margin-bottom: 0.5rem; color: var(--document-foreground); font-weight: 700; }
    .typeset ul, .typeset ol { padding-left: 1.25rem; margin-bottom: 0.75rem; }
    .typeset li { margin-bottom: 0.25rem; }
    .typeset blockquote { border-left: 3px solid var(--document-border); padding-left: 1rem; font-style: italic; color: var(--document-muted-foreground); margin: 0.75rem 0; }
    .typeset a { color: var(--document-accent); text-decoration: underline; }
  </style>
</head>
<body>
  ${appMarkup}
</body>
</html>`
}
