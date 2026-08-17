import { PencilSquareIcon, PhotoIcon } from "@heroicons/react/24/outline"
import type {
  InvoiceRenderModel,
  ProposalRenderModel,
} from "@workspace/document"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { DocumentBlock, PartySnapshot } from "@workspace/document/schema"
import {
  DocumentHeaderRenderer,
  type HeaderLayoutId,
} from "./document-header-renderer"
import { RichTextRenderer } from "./RichTextRenderer"

type BlockRendererProps = {
  block: DocumentBlock
  seller: PartySnapshot
  customer: PartySnapshot
  title: string
  issueDate: string
  validUntil?: string
  dueDate?: string
  invoiceNumber?: string
  paymentTerms?: string
  locale?: string
  currency?: string
  pricing?: ProposalRenderModel["pricing"] | InvoiceRenderModel["pricing"]
}

export function DocumentBlockRenderer(props: BlockRendererProps) {
  const { block } = props

  switch (block.type) {
    case "partyHeader": {
      const layout =
        (block.config?.layout as HeaderLayoutId) || "mark-left-dates-right"
      const kind = block.binding === "invoice.parties" ? "invoice" : "proposal"
      return (
        <DocumentHeaderRenderer
          kind={kind}
          layout={layout}
          title={props.title}
          issueDate={props.issueDate}
          validUntil={props.validUntil}
          dueDate={props.dueDate}
          invoiceNumber={props.invoiceNumber}
          paymentTerms={props.paymentTerms}
          seller={props.seller}
          customer={props.customer}
          locale={props.locale}
        />
      )
    }

    case "section": {
      const variant = block.variant ?? "default"
      const variantClass =
        variant === "accent"
          ? "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-6 sm:p-8"
          : variant === "compact"
            ? "border-t border-[var(--document-border)] pt-8"
            : ""

      return (
        <section
          key={block.id}
          className={`my-[var(--document-section-spacing)] break-inside-avoid space-y-4 text-[var(--document-foreground)] ${variantClass}`}
        >
          {block.eyebrow?.content?.length ? (
            <div className="font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.18em]">
              <RichTextRenderer doc={block.eyebrow} />
            </div>
          ) : null}
          <h2 className="font-bold text-2xl leading-tight [font-family:var(--document-heading-font-family)] sm:text-3xl">
            <RichTextRenderer doc={block.title} />
          </h2>
          {block.lead?.content?.length ? (
            <div className="text-[var(--document-muted-foreground)] text-base leading-7">
              <RichTextRenderer doc={block.lead} />
            </div>
          ) : null}
          {block.content && (
            <div className="mt-4">
              <RichTextRenderer doc={block.content} />
            </div>
          )}
        </section>
      )
    }

    case "cover": {
      const variant = block.variant ?? "split"
      const isSplit = variant !== "minimal"
      return (
        <section
          key={block.id}
          className="proposal-cover my-[var(--document-section-spacing)] break-inside-avoid text-[var(--document-foreground)]"
        >
          <div
            className={[
              "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-6 sm:p-10",
              isSplit
                ? "grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center"
                : "",
            ].join(" ")}
          >
            <div className="space-y-4">
              {block.eyebrow?.content?.length ? (
                <div className="font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.18em]">
                  <RichTextRenderer doc={block.eyebrow} />
                </div>
              ) : null}
              <h2 className="font-bold text-3xl leading-tight [font-family:var(--document-heading-font-family)] sm:text-4xl">
                <RichTextRenderer doc={block.title} />
              </h2>
              {block.subtitle?.content?.length ? (
                <div className="text-[var(--document-muted-foreground)] text-base leading-7">
                  <RichTextRenderer doc={block.subtitle} />
                </div>
              ) : null}
            </div>
            {isSplit ? (
              <div className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_65%,transparent)]">
                <PhotoIcon className="h-8 w-8" />
                <span className="font-semibold text-[10px] uppercase tracking-widest">
                  {block.media?.alt || "Cover Visual"}
                </span>
              </div>
            ) : null}
          </div>
        </section>
      )
    }

    case "columns": {
      const cols = block.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
      return (
        <section
          key={block.id}
          className="proposal-columns my-[var(--document-section-spacing)] break-inside-avoid space-y-4 text-[var(--document-foreground)]"
        >
          {block.title && (
            <h3 className="font-bold text-xl [font-family:var(--document-heading-font-family)] sm:text-2xl">
              <RichTextRenderer doc={block.title} />
            </h3>
          )}
          <div className={`grid grid-cols-1 gap-6 ${cols}`}>
            {block.items.map((item) => (
              <div
                key={item.id}
                className="space-y-2 border-[var(--document-border)] border-t pt-4"
              >
                <h4 className="font-semibold text-base leading-snug">
                  <RichTextRenderer doc={item.heading} />
                </h4>
                <div className="text-[var(--document-muted-foreground)] text-sm leading-relaxed">
                  <RichTextRenderer doc={item.body} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )
    }

    case "imageText": {
      const reverse = block.reverse === true
      return (
        <section
          key={block.id}
          className="proposal-image-text my-[var(--document-section-spacing)] break-inside-avoid text-[var(--document-foreground)]"
        >
          <div
            className={[
              "grid gap-8 md:grid-cols-2 md:items-center",
              reverse ? "md:[&>*:first-child]:order-2" : "",
            ].join(" ")}
          >
            <div className="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_65%,transparent)]">
              <PhotoIcon className="h-8 w-8" />
              <span className="font-semibold text-[10px] uppercase tracking-widest">
                {block.image?.alt || "Image"}
              </span>
            </div>
            <div className="space-y-3">
              {block.eyebrow?.content?.length ? (
                <div className="font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.18em]">
                  <RichTextRenderer doc={block.eyebrow} />
                </div>
              ) : null}
              <h3 className="font-bold text-2xl [font-family:var(--document-heading-font-family)]">
                <RichTextRenderer doc={block.title} />
              </h3>
              <div className="text-[var(--document-muted-foreground)] text-sm leading-relaxed">
                <RichTextRenderer doc={block.content} />
              </div>
            </div>
          </div>
        </section>
      )
    }

    case "imageCards": {
      const cols =
        block.columns === 1
          ? "grid-cols-1"
          : block.columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
      const horizontal = block.variant === "horizontal"

      return (
        <section
          key={block.id}
          className={`proposal-image-cards my-[var(--document-section-spacing)] grid gap-6 ${cols} break-inside-avoid text-[var(--document-foreground)]`}
        >
          {block.items.map((item) => (
            <div
              key={item.id}
              className={[
                "space-y-3 rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-page-background)_90%,transparent)] p-4 shadow-2xs",
                horizontal
                  ? "grid grid-cols-[6rem_1fr] items-start gap-4 space-y-0"
                  : "",
              ].join(" ")}
            >
              <div className="flex min-h-28 w-full flex-col items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[color-mix(in_oklab,var(--document-muted-foreground)_65%,transparent)]">
                <PhotoIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base leading-snug">
                  <RichTextRenderer doc={item.title} />
                </h4>
                <div className="text-[var(--document-muted-foreground)] text-xs leading-relaxed">
                  <RichTextRenderer doc={item.body} />
                </div>
              </div>
            </div>
          ))}
        </section>
      )
    }

    case "metrics": {
      const cols =
        block.columns === 1
          ? "grid-cols-1"
          : block.columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"

      return (
        <section
          key={block.id}
          className={`proposal-metrics my-[var(--document-section-spacing)] grid gap-6 ${cols} break-inside-avoid text-[var(--document-foreground)]`}
        >
          {block.items.map((item) => (
            <div
              key={item.id}
              className="flex break-inside-avoid flex-col items-center justify-start p-4 text-center"
            >
              <div className="mb-1 min-h-[1.2em] font-black text-4xl text-[var(--document-accent)] tracking-tight md:text-5xl">
                <RichTextRenderer doc={item.value} />
              </div>
              <div className="mb-1 min-h-[1.2em] font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
                <RichTextRenderer doc={item.label} />
              </div>
              {item.detail && (
                <div className="text-[var(--document-muted-foreground)] text-xs leading-relaxed md:text-sm">
                  <RichTextRenderer doc={item.detail} />
                </div>
              )}
            </div>
          ))}
        </section>
      )
    }

    case "team": {
      const cols =
        block.columns === 1
          ? "grid-cols-1"
          : block.columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"

      return (
        <section
          key={block.id}
          className={`proposal-team my-[var(--document-section-spacing)] grid gap-6 ${cols} break-inside-avoid text-[var(--document-foreground)]`}
        >
          {block.items.map((item) => (
            <div
              key={item.id}
              className="flex break-inside-avoid flex-col items-center justify-start p-4 text-center"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)]">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <title>Team member avatar</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="mb-0.5 font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
                <RichTextRenderer doc={item.name} />
              </div>
              <div className="mb-2 font-medium text-[var(--document-muted-foreground)] text-xs md:text-sm">
                <RichTextRenderer doc={item.role} />
              </div>
              {item.bio && (
                <div className="text-[var(--document-muted-foreground)] text-xs leading-relaxed">
                  <RichTextRenderer doc={item.bio} />
                </div>
              )}
            </div>
          ))}
        </section>
      )
    }

    case "testimonials": {
      const cols =
        block.columns === 1
          ? "grid-cols-1"
          : block.columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"

      return (
        <section
          key={block.id}
          className={`proposal-testimonials my-[var(--document-section-spacing)] grid gap-6 ${cols} break-inside-avoid text-[var(--document-foreground)]`}
        >
          {block.items.map((item) => (
            <blockquote
              key={item.id}
              className="break-inside-avoid space-y-3 border-[var(--document-accent)] border-l-2 py-1 pl-4 text-left"
            >
              <div className="text-[var(--document-muted-foreground)] text-sm italic leading-relaxed md:text-base">
                <RichTextRenderer doc={item.quote} />
              </div>
              <div>
                <div className="font-bold text-[var(--document-foreground)] text-sm">
                  <RichTextRenderer doc={item.author} />
                </div>
                <div className="text-[var(--document-muted-foreground)] text-xs">
                  <RichTextRenderer doc={item.role} />
                </div>
              </div>
            </blockquote>
          ))}
        </section>
      )
    }

    case "signature": {
      return (
        <section
          key={block.id}
          className="proposal-signature my-[var(--document-section-spacing)] grid break-inside-avoid gap-8 border-[var(--document-border)] border-t pt-8 text-[var(--document-foreground)] md:grid-cols-[1fr_16rem]"
        >
          <div className="space-y-3">
            <h3 className="font-bold text-xl [font-family:var(--document-heading-font-family)]">
              <RichTextRenderer doc={block.title} />
            </h3>
            <div className="text-[var(--document-muted-foreground)] text-xs leading-relaxed">
              <RichTextRenderer doc={block.terms} />
            </div>
          </div>
          <div className="flex min-h-24 flex-col justify-end border-[var(--document-border)] border-t pt-4 text-right">
            <PencilSquareIcon className="ml-auto h-6 w-6 text-[var(--document-muted-foreground)]" />
            <p className="mt-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
              Authorized Signature
            </p>
          </div>
        </section>
      )
    }

    case "timeline": {
      return (
        <section
          key={block.id}
          className="proposal-timeline my-[var(--document-section-spacing)] break-inside-avoid border-[var(--document-border)] border-l-2 pl-5 text-[var(--document-foreground)]"
        >
          <RichTextRenderer doc={block.content} />
        </section>
      )
    }

    case "faq": {
      return (
        <section
          key={block.id}
          className="proposal-faq my-[var(--document-section-spacing)] break-inside-avoid space-y-4 text-[var(--document-foreground)]"
        >
          <h3 className="font-bold text-xl [font-family:var(--document-heading-font-family)] sm:text-2xl">
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {block.items.map((item) => (
              <div
                key={item.id}
                className="space-y-1.5 rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-page-background)_90%,transparent)] p-4"
              >
                <h4 className="font-semibold text-[var(--document-foreground)] text-base">
                  <RichTextRenderer doc={item.question} />
                </h4>
                <div className="text-[var(--document-muted-foreground)] text-sm leading-relaxed">
                  <RichTextRenderer doc={item.answer} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )
    }

    case "gallery": {
      const cols =
        block.columns === 1
          ? "grid-cols-1"
          : block.columns === 2
            ? "grid-cols-2"
            : "grid-cols-3"

      return (
        <section
          key={block.id}
          className={`proposal-gallery my-[var(--document-section-spacing)] grid gap-4 ${cols} break-inside-avoid`}
        >
          {block.images.map((image) => (
            <div
              key={image.id}
              className="flex aspect-square items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[var(--document-muted-foreground)] text-xs"
            >
              {image.alt || "Gallery Item"}
            </div>
          ))}
        </section>
      )
    }

    case "pricing": {
      const pricing = props.pricing
      if (!pricing) return null
      const currency = props.currency || "USD"
      const locale = props.locale || "en-US"
      const calculation = pricing.calculation

      return (
        <section
          key={block.id}
          className="proposal-pricing my-[var(--document-section-spacing)] break-inside-avoid space-y-4 border-[var(--document-border)] border-b pb-8 text-[var(--document-foreground)]"
        >
          <h2 className="font-bold text-xl tracking-tight [font-family:var(--document-heading-font-family)] sm:text-2xl">
            {block.config?.title || "Pricing Breakdown"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-[var(--document-border)] border-b font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
                  <th className="py-2.5 pr-4">Description</th>
                  <th className="px-2 py-2.5 text-center">Qty</th>
                  <th className="px-2 py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 pl-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color-mix(in_oklab,var(--document-border)_60%,transparent)]">
                {pricing.items.map((item, idx) => {
                  const line = calculation?.lines?.find(
                    (l: { id: string; amountMinor: number }) => l.id === item.id
                  )
                  const lineAmount = line
                    ? line.amountMinor
                    : item.unitPriceMinor * Number(item.quantity)
                  return (
                    <tr key={item.id || idx}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--document-foreground)]">
                          {item.description}
                        </div>
                        {item.details && (
                          <div className="mt-0.5 text-[var(--document-muted-foreground)] text-xs">
                            {item.details}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center align-top text-[var(--document-foreground)]">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-3 text-right align-top text-[var(--document-foreground)]">
                        {formatMoneyMinor(
                          item.unitPriceMinor,
                          currency,
                          locale
                        )}
                      </td>
                      <td className="py-3 pl-4 text-right align-top font-semibold text-[var(--document-foreground)]">
                        {formatMoneyMinor(lineAmount, currency, locale)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {calculation && (
            <div className="flex justify-end pt-3">
              <div className="w-full space-y-2 text-sm sm:w-72">
                <div className="flex justify-between text-[var(--document-muted-foreground)]">
                  <span>Subtotal:</span>
                  <span className="font-medium text-[var(--document-foreground)]">
                    {formatMoneyMinor(
                      calculation.subtotalMinor,
                      currency,
                      locale
                    )}
                  </span>
                </div>
                {calculation.discountMinor > 0 && (
                  <div className="flex justify-between text-[var(--document-muted-foreground)]">
                    <span>Discount:</span>
                    <span className="font-medium text-[var(--document-accent)]">
                      -
                      {formatMoneyMinor(
                        calculation.discountMinor,
                        currency,
                        locale
                      )}
                    </span>
                  </div>
                )}
                {calculation.taxMinor > 0 && (
                  <div className="flex justify-between text-[var(--document-muted-foreground)]">
                    <span>Tax:</span>
                    <span className="font-medium text-[var(--document-foreground)]">
                      {formatMoneyMinor(calculation.taxMinor, currency, locale)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-[var(--document-border)] border-t pt-2 font-bold text-[var(--document-foreground)] text-base">
                  <span>Total:</span>
                  <span className="text-[var(--document-foreground)]">
                    {formatMoneyMinor(calculation.totalMinor, currency, locale)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      )
    }

    case "richText": {
      return (
        <section
          key={block.id}
          className="proposal-rich-text my-[var(--document-section-spacing)] break-inside-avoid text-[var(--document-foreground)]"
        >
          <RichTextRenderer doc={block.content} />
        </section>
      )
    }

    default:
      return null
  }
}
