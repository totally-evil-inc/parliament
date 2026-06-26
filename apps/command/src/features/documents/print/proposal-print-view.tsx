import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import { getDocumentTemplateStyle } from "@workspace/document/presentation"
import { RichTextInlineRenderer, RichTextRenderer } from "./rich-text-renderer"
import type { DocumentBlock } from "@workspace/document/schema"
import type { RichTextNode } from "@workspace/document/schema"
import type { ProposalRenderModel } from "@workspace/document/render"
import type { DocumentTemplate } from "@workspace/document/presentation"

type BlockRendererProps = {
  block: DocumentBlock
  model: ProposalRenderModel
}

const blockRenderers: Record<
  DocumentBlock["type"],
  (props: BlockRendererProps) => React.ReactNode
> = {
  partyHeader: ({ block, model }) =>
    block.type === "partyHeader" ? <Header model={model} /> : null,
  pricing: ({ block, model }) =>
    block.type === "pricing" ? <Pricing block={block} model={model} /> : null,
  richText: ({ block }) =>
    block.type === "richText" ? (
      <RichTextRenderer
        className="prose prose-sm max-w-none text-[var(--document-foreground)]"
        content={block.content}
      />
    ) : null,
  section: ({ block }) =>
    block.type === "section" ? <ProposalSection block={block} /> : null,
  timeline: ({ block }) =>
    block.type === "timeline" ? (
      <section className="my-[var(--document-section-spacing)] border-l border-[var(--document-border)] pl-5">
        <SectionHeading eyebrow="Project Plan" title="How the work unfolds" />
        <RichTextRenderer content={block.content} />
      </section>
    ) : null,
  metrics: ({ block }) =>
    block.type === "metrics" ? (
      <section className="my-[var(--document-section-spacing)]">
        <SectionHeading
          eyebrow="Outcomes"
          title="What success will look like"
        />
        <RichTextRenderer
          className={`mt-8 grid gap-8 ${columns(block.columns)}`}
          content={block.content}
        />
      </section>
    ) : null,
  team: ({ block }) =>
    block.type === "team" ? (
      <section className="my-[var(--document-section-spacing)]">
        <SectionHeading eyebrow="Team" title="Who will lead the work" />
        <RichTextRenderer
          className={`mt-8 grid gap-8 ${columns(block.columns)}`}
          content={block.content}
        />
      </section>
    ) : null,
  testimonials: ({ block }) =>
    block.type === "testimonials" ? (
      <section className="my-[var(--document-section-spacing)]">
        <SectionHeading eyebrow="Proof" title="Relevant client confidence" />
        <RichTextRenderer
          className={`mt-8 grid gap-8 ${columns(block.columns)}`}
          content={block.content}
        />
      </section>
    ) : null,
  gallery: ({ block }) =>
    block.type === "gallery" ? (
      <section className={`my-8 grid gap-4 ${columns(block.columns)}`}>
        {block.images.map((image) => (
          <div
            key={image.id}
            className="flex aspect-square items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-xs text-[var(--document-muted-foreground)]"
          >
            {image.alt || "Image"}
          </div>
        ))}
      </section>
    ) : null,
  faq: ({ block }) => (block.type === "faq" ? <Faq block={block} /> : null),
}

export function ProposalPrintView({
  model,
  template,
}: {
  model: ProposalRenderModel
  template: DocumentTemplate
}) {
  return (
    <main
      className="document-print-canvas min-h-screen bg-[var(--document-canvas-background)] text-[var(--document-foreground)] print:bg-transparent"
      style={getDocumentTemplateStyle(template)}
      data-document-template={`${model.template.id}@${model.template.version}`}
      data-document-type="proposal"
    >
      <article className="document-print-page mx-auto min-h-[297mm] w-[210mm] bg-[var(--document-page-background)] px-[18mm] py-[18mm] [font-family:var(--document-font-family)] shadow-2xl shadow-black/10 print:min-h-0 print:w-auto print:px-0 print:py-0 print:shadow-none">
        {model.blocks.map((block) => {
          const Renderer = blockRenderers[block.type]
          return <Renderer key={block.id} block={block} model={model} />
        })}
      </article>
    </main>
  )
}

function Header({ model }: { model: ProposalRenderModel }) {
  return (
    <header className="break-inside-avoid pb-[var(--document-section-spacing)]">
      <div className="rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-10">
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-8">
            <div className="flex h-12 w-28 items-center justify-center rounded-[var(--document-radius)] border border-[color-mix(in_oklab,var(--document-accent)_28%,var(--document-border))] bg-[var(--document-page-background)] text-xs font-semibold text-[var(--document-accent)]">
              {model.seller.name ? model.seller.name.slice(0, 2) : "PR"}
            </div>
            <div className="max-w-[29rem]">
              <p className="mb-4 text-[10px] font-bold tracking-[0.22em] text-[var(--document-accent)] uppercase">
                Proposal
              </p>
              {model.title ? (
                <h1
                  className="[font-family:var(--document-heading-font-family)] text-5xl leading-none font-bold tracking-normal"
                  dangerouslySetInnerHTML={{ __html: model.title }}
                />
              ) : (
                <h1 className="[font-family:var(--document-heading-font-family)] text-5xl leading-none font-bold tracking-normal">
                  Proposal
                </h1>
              )}
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--document-muted-foreground)]">
                A focused plan for a clear, performant, and conversion-ready web
                presence.
              </p>
            </div>
          </div>
          <div className="grid gap-4 text-right text-sm">
            <DateValue
              label="Date"
              value={model.issueDate}
              locale={model.locale}
            />
            {model.validUntil ? (
              <DateValue
                label="Valid Until"
                value={model.validUntil}
                locale={model.locale}
              />
            ) : null}
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-16 border-t border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] pt-8">
          <Party label="Prepared By" party={model.seller} />
          <Party label="Prepared For" party={model.customer} />
        </div>
      </div>
    </header>
  )
}

function DateValue({
  label,
  locale,
  value,
}: {
  label: string
  locale: string
  value: string
}) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </p>
      <p>{formatDateOnly(value, locale)}</p>
    </div>
  )
}

function Party({
  label,
  party,
}: {
  label: string
  party: ProposalRenderModel["seller"]
}) {
  return (
    <section className="space-y-2 text-sm">
      <p className="mb-5 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </p>
      {[
        ["name", party.name],
        ["email", party.email],
        ["address", party.address],
        ["phone", party.phone],
        ["website", party.website],
        ["taxId", party.taxId],
      ]
        .filter((field) => Boolean(field[1]))
        .map(([key, value]) => {
          if (key === "address") {
            return <p key={key} dangerouslySetInnerHTML={{ __html: value }} />
          }
          return <p key={key}>{value}</p>
        })}
      {party.customFields.map((field) => (
        <p key={field.id}>
          <strong>{field.label}:</strong> {field.value}
        </p>
      ))}
    </section>
  )
}

function ProposalSection({
  block,
}: {
  block: Extract<DocumentBlock, { type: "section" }>
}) {
  const variantClassName =
    block.variant === "accent"
      ? "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-8"
      : block.variant === "compact"
        ? "border-t border-[var(--document-border)] pt-8"
        : ""

  return (
    <section
      className={`my-[var(--document-section-spacing)] break-inside-avoid ${variantClassName}`}
    >
      <SectionHeading
        eyebrow={block.eyebrow}
        lead={block.lead}
        title={block.title}
      />
      <RichTextRenderer
        className="prose prose-sm mt-5 max-w-none text-[var(--document-foreground)]"
        content={block.content}
      />
    </section>
  )
}

function SectionHeading({
  eyebrow,
  lead,
  title,
}: {
  eyebrow?: RichTextNode | string
  lead?: RichTextNode | string
  title: RichTextNode | string
}) {
  return (
    <div className="max-w-2xl">
      {hasRichTextContent(eyebrow) ? (
        <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[var(--document-accent)] uppercase">
          <RichTextInlineRenderer content={eyebrow} />
        </p>
      ) : null}
      <h2 className="[font-family:var(--document-heading-font-family)] text-3xl leading-tight font-bold tracking-normal">
        <RichTextInlineRenderer content={title} />
      </h2>
      {hasRichTextContent(lead) ? (
        <p className="mt-3 text-base leading-7 text-[var(--document-muted-foreground)]">
          <RichTextInlineRenderer content={lead} />
        </p>
      ) : null}
    </div>
  )
}

function Faq({ block }: { block: Extract<DocumentBlock, { type: "faq" }> }) {
  return (
    <section className="my-[var(--document-section-spacing)] break-inside-avoid">
      <SectionHeading eyebrow="FAQ" title="Common Questions" />
      <div className="mt-6 divide-y divide-[var(--document-border)] border-y border-[var(--document-border)]">
        {block.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-4 py-5 md:grid-cols-[15rem_1fr]"
          >
            <h3 className="text-base leading-6 font-semibold">
              <RichTextInlineRenderer content={item.question} />
            </h3>
            <RichTextRenderer
              className="prose prose-sm max-w-none text-[var(--document-muted-foreground)]"
              content={item.answer}
            />
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
  model: ProposalRenderModel
}) {
  const pricing = model.pricing
  if (!pricing) return null
  const money = (value: number) =>
    formatMoneyMinor(value, pricing.currency, model.locale)
  return (
    <section className="my-8">
      <div className="border-b border-[var(--document-border)] pb-4">
        <h2 className="text-xs font-bold tracking-[0.16em] uppercase">
          {block.config.title}
        </h2>
        <p className="mt-1.5 text-xs text-[var(--document-muted-foreground)]">
          Indicative proposal pricing
        </p>
      </div>
      <div className="pt-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--document-border)] text-left text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
              <th className="py-3 pr-5">Description</th>
              <th className="px-3 py-3 text-center">Qty</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pricing.items.map((item, index) => (
              <tr key={item.id} className="break-inside-avoid align-top">
                <td className="py-5 pr-5">
                  <p
                    className="font-medium"
                    dangerouslySetInnerHTML={{ __html: item.description || "" }}
                  />
                  {item.details ? (
                    <p
                      className="text-sm text-[var(--document-muted-foreground)]"
                      dangerouslySetInnerHTML={{ __html: item.details }}
                    />
                  ) : null}
                </td>
                <td className="px-3 py-5 text-center">{item.quantity}</td>
                <td className="px-3 py-5 text-right tabular-nums">
                  {money(item.unitPriceMinor)}
                </td>
                <td className="px-3 py-5 text-right font-semibold tabular-nums">
                  {money(pricing.calculation.lines[index]?.amountMinor ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 ml-auto w-72 space-y-3 border-t border-[var(--document-border)] pt-5 text-sm">
          <Total
            label="Subtotal"
            value={money(pricing.calculation.subtotalMinor)}
          />
          {pricing.discount ? (
            <Total
              label="Discount"
              value={money(-pricing.calculation.discountMinor)}
            />
          ) : null}
          {pricing.tax ? (
            <Total label="Tax" value={money(pricing.calculation.taxMinor)} />
          ) : null}
          <Total
            label="Total"
            value={money(pricing.calculation.totalMinor)}
            strong
          />
        </div>
        <div className="mt-12 flex justify-end">
          <div className="w-64 border-t border-[var(--document-border)] pt-4 text-right">
            <p className="font-[cursive] text-3xl leading-none text-[var(--document-foreground)]">
              {pricing.signerName || model.seller.name || "Signer name"}
            </p>
            <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
              {pricing.signerTitle || "Signature"}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Total({
  label,
  strong = false,
  value,
}: {
  label: string
  strong?: boolean
  value: string
}) {
  return (
    <div
      className={`flex justify-between ${strong ? "border-t pt-3 text-lg font-bold" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function columns(value: 1 | 2 | 3) {
  return value === 1
    ? "grid-cols-1"
    : value === 2
      ? "grid-cols-2"
      : "grid-cols-3"
}

function hasRichTextContent(value: RichTextNode | string | undefined) {
  if (typeof value === "string") return value.length > 0
  if (!value) return false
  if (value.text) return true
  return (value.content ?? []).some(hasRichTextContent)
}
