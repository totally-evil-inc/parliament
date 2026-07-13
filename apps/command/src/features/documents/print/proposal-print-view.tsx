import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import type { DocumentTemplate } from "@workspace/document/presentation"
import { getDocumentTemplateStyle } from "@workspace/document/presentation"
import type { ProposalRenderModel } from "@workspace/document/render"
import type { DocumentBlock, RichTextNode } from "@workspace/document/schema"
import { RichTextInlineRenderer, RichTextRenderer } from "./rich-text-renderer"

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
  cover: ({ block, model }) =>
    block.type === "cover" ? <Cover block={block} model={model} /> : null,
  columns: ({ block }) =>
    block.type === "columns" ? <Columns block={block} /> : null,
  imageText: ({ block }) =>
    block.type === "imageText" ? <ImageText block={block} /> : null,
  imageCards: ({ block }) =>
    block.type === "imageCards" ? <ImageCards block={block} /> : null,
  signature: ({ block, model }) =>
    block.type === "signature" ? (
      <Signature block={block} model={model} />
    ) : null,
  timeline: ({ block }) =>
    block.type === "timeline" ? (
      <section className="my-[var(--document-section-spacing)] border-[var(--document-border)] border-l pl-5">
        <SectionHeading eyebrow="Project Plan" title="How the work unfolds" />
        <RichTextRenderer content={block.content} />
      </section>
    ) : null,
  metrics: ({ block }) =>
    block.type === "metrics" ? <Metrics block={block} /> : null,
  team: ({ block }) => (block.type === "team" ? <Team block={block} /> : null),
  testimonials: ({ block }) =>
    block.type === "testimonials" ? <Testimonials block={block} /> : null,
  gallery: ({ block }) =>
    block.type === "gallery" ? (
      <section className={`my-8 grid gap-4 ${columns(block.columns)}`}>
        {block.images.map((image) => (
          <div
            key={image.id}
            className="flex aspect-square items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] text-[var(--document-muted-foreground)] text-xs"
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
      <article className="document-print-page mx-auto min-h-[297mm] w-[210mm] bg-[var(--document-page-background)] px-[18mm] py-[18mm] shadow-2xl shadow-black/10 [font-family:var(--document-font-family)] print:min-h-0 print:w-auto print:px-0 print:py-0 print:shadow-none">
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
            <div className="flex h-12 w-28 items-center justify-center rounded-[var(--document-radius)] border border-[color-mix(in_oklab,var(--document-accent)_28%,var(--document-border))] bg-[var(--document-page-background)] font-semibold text-[var(--document-accent)] text-xs">
              {model.seller.name ? model.seller.name.slice(0, 2) : "PR"}
            </div>
            <div className="max-w-[29rem]">
              <p className="mb-4 font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.22em]">
                Proposal
              </p>
              {model.title ? (
                <h1
                  className="font-bold text-5xl leading-none tracking-normal [font-family:var(--document-heading-font-family)]"
                  dangerouslySetInnerHTML={{ __html: model.title }}
                />
              ) : (
                <h1 className="font-bold text-5xl leading-none tracking-normal [font-family:var(--document-heading-font-family)]">
                  Proposal
                </h1>
              )}
              <p className="mt-5 max-w-xl text-[var(--document-muted-foreground)] text-base leading-7">
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
        <div className="mt-10 grid grid-cols-2 gap-16 border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] border-t pt-8">
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
      <p className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
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
      <p className="mb-5 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
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

function Cover({
  block,
  model,
}: {
  block: Extract<DocumentBlock, { type: "cover" }>
  model: ProposalRenderModel
}) {
  const minimal = block.variant === "minimal"
  return (
    <section className="break-inside-avoid pb-[var(--document-section-spacing)]">
      <div
        className={[
          "rounded-[calc(var(--document-radius)*1.5)] border border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_7%,transparent)] p-10",
          minimal ? "" : "grid gap-10 md:grid-cols-[1.15fr_0.85fr]",
        ].join(" ")}
      >
        <div>
          <SectionHeading
            eyebrow={block.eyebrow}
            lead={block.subtitle}
            title={block.title}
          />
          <div className="mt-8 grid gap-8 border-[color-mix(in_oklab,var(--document-accent)_18%,var(--document-border))] border-t pt-6 text-sm md:grid-cols-2">
            <Party label="Prepared By" party={model.seller} />
            <Party label="Prepared For" party={model.customer} />
          </div>
        </div>
        {minimal ? null : (
          <ImagePlaceholder
            alt={block.media?.alt}
            className={block.variant === "band" ? "min-h-72" : "min-h-96"}
          />
        )}
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
    <section className="my-[var(--document-section-spacing)] break-inside-avoid">
      <SectionHeading title={block.title} />
      <div className={`mt-7 grid gap-6 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <section
            key={item.id}
            className="border-[var(--document-border)] border-t pt-5"
          >
            <h3 className="font-semibold text-base leading-6">
              <RichTextInlineRenderer content={item.heading} />
            </h3>
            <RichTextRenderer
              className="prose prose-sm mt-2 max-w-none text-[var(--document-muted-foreground)]"
              content={item.body}
            />
          </section>
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
    <section className="my-[var(--document-section-spacing)] break-inside-avoid">
      <div
        className={[
          "grid gap-10 md:grid-cols-2 md:items-center",
          block.reverse ? "md:[&>*:first-child]:order-2" : "",
        ].join(" ")}
      >
        <ImagePlaceholder alt={block.image?.alt} className="min-h-72" />
        <div>
          <SectionHeading eyebrow={block.eyebrow} title={block.title} />
          <RichTextRenderer
            className="prose prose-sm mt-5 max-w-none text-[var(--document-foreground)]"
            content={block.content}
          />
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
  const horizontal = block.variant === "horizontal"
  return (
    <section className={`my-8 grid gap-4 ${columns(block.columns)}`}>
      {block.items.map((item) => (
        <section
          key={item.id}
          className={[
            "break-inside-avoid rounded-[var(--document-radius)] border border-[var(--document-border)] p-4",
            horizontal ? "grid gap-4 md:grid-cols-[7rem_1fr]" : "space-y-4",
          ].join(" ")}
        >
          <ImagePlaceholder
            alt={item.image?.alt}
            className={horizontal ? "min-h-28" : "min-h-40"}
          />
          <div>
            <h3 className="font-semibold text-base leading-6">
              <RichTextInlineRenderer content={item.title} />
            </h3>
            <RichTextRenderer
              className="prose prose-sm mt-2 max-w-none text-[var(--document-muted-foreground)]"
              content={item.body}
            />
          </div>
        </section>
      ))}
    </section>
  )
}

function Metrics({
  block,
}: {
  block: Extract<DocumentBlock, { type: "metrics" }>
}) {
  return (
    <section className="my-[var(--document-section-spacing)]">
      <SectionHeading eyebrow="Outcomes" title="What success will look like" />
      <div className={`mt-8 grid gap-8 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <section key={item.id} className="break-inside-avoid text-center">
            <div className="mb-1.5 font-black text-4xl text-[var(--document-accent)] tracking-tight md:text-5xl">
              <RichTextInlineRenderer content={item.value} />
            </div>
            <div className="mb-1 font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
              <RichTextInlineRenderer content={item.label} />
            </div>
            <RichTextRenderer
              className="text-[var(--document-muted-foreground)] text-sm leading-relaxed md:text-base"
              content={item.detail}
            />
          </section>
        ))}
      </div>
    </section>
  )
}

function Team({ block }: { block: Extract<DocumentBlock, { type: "team" }> }) {
  return (
    <section className="my-[var(--document-section-spacing)]">
      <SectionHeading eyebrow="Team" title="Who will lead the work" />
      <div className={`mt-8 grid gap-8 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <section
            key={item.id}
            className="flex break-inside-avoid flex-col items-center justify-start text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)] md:h-20 md:w-20">
              <svg
                className="h-8 w-8 md:h-9 md:w-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="mb-1 font-bold text-[var(--document-foreground)] text-base tracking-tight md:text-lg">
              <RichTextInlineRenderer content={item.name} />
            </div>
            <div className="mb-3 font-medium text-[var(--document-muted-foreground)] text-sm md:text-base">
              <RichTextInlineRenderer content={item.role} />
            </div>
            <RichTextRenderer
              className="text-[var(--document-muted-foreground)] text-xs leading-normal md:text-sm"
              content={item.bio}
            />
          </section>
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
    <section className="my-[var(--document-section-spacing)]">
      <SectionHeading eyebrow="Proof" title="Relevant client confidence" />
      <div className={`mt-8 grid gap-8 ${columns(block.columns)}`}>
        {block.items.map((item) => (
          <blockquote
            key={item.id}
            className="m-0 break-inside-avoid border-[var(--document-accent)] border-l-2 py-1 pl-5 text-left"
          >
            <RichTextRenderer
              className="mb-3 font-medium text-[var(--document-muted-foreground)] text-base italic leading-relaxed md:text-lg"
              content={item.quote}
            />
            <div className="mb-0.5 font-bold text-[var(--document-foreground)] text-sm tracking-tight md:text-base">
              <RichTextInlineRenderer content={item.author} />
            </div>
            <div className="font-medium text-[var(--document-muted-foreground)] text-xs md:text-sm">
              <RichTextInlineRenderer content={item.role} />
            </div>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

function Signature({
  block,
  model,
}: {
  block: Extract<DocumentBlock, { type: "signature" }>
  model: ProposalRenderModel
}) {
  const signerName =
    model.pricing?.signerName || model.seller.name || "Signer name"
  const signerTitle = model.pricing?.signerTitle || "Signature"
  return (
    <section className="my-[var(--document-section-spacing)] break-inside-avoid border-[var(--document-border)] border-t pt-8">
      <div className="grid gap-8 md:grid-cols-[1fr_16rem]">
        <div>
          <SectionHeading title={block.title} />
          <RichTextRenderer
            className="prose prose-sm mt-3 max-w-none text-[var(--document-muted-foreground)]"
            content={block.terms}
          />
        </div>
        <div className="flex min-h-32 flex-col justify-end border-[var(--document-border)] border-t pt-4 text-right">
          <p className="font-[cursive] text-3xl text-[var(--document-foreground)] leading-none">
            {signerName}
          </p>
          <p className="mt-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
            {signerTitle}
          </p>
        </div>
      </div>
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
        <p className="mb-2 font-bold text-[10px] text-[var(--document-accent)] uppercase tracking-[0.18em]">
          <RichTextInlineRenderer content={eyebrow} />
        </p>
      ) : null}
      <h2 className="font-bold text-3xl leading-tight tracking-normal [font-family:var(--document-heading-font-family)]">
        <RichTextInlineRenderer content={title} />
      </h2>
      {hasRichTextContent(lead) ? (
        <p className="mt-3 text-[var(--document-muted-foreground)] text-base leading-7">
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
      <div className="mt-6 divide-y divide-[var(--document-border)] border-[var(--document-border)] border-y">
        {block.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-4 py-5 md:grid-cols-[15rem_1fr]"
          >
            <h3 className="font-semibold text-base leading-6">
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

function ImagePlaceholder({
  alt,
  className,
}: {
  alt?: string
  className?: string
}) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] px-4 text-center text-[var(--document-muted-foreground)] text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {alt || "Image"}
    </div>
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
      <div className="border-[var(--document-border)] border-b pb-4">
        <h2 className="font-bold text-xs uppercase tracking-[0.16em]">
          {block.config.title}
        </h2>
        <p className="mt-1.5 text-[var(--document-muted-foreground)] text-xs">
          Indicative proposal pricing
        </p>
      </div>
      <div className="pt-5">
        <table className="w-full">
          <thead>
            <tr className="border-[var(--document-border)] border-b text-left font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
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
                      className="text-[var(--document-muted-foreground)] text-sm"
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
        <div className="mt-8 ml-auto w-72 space-y-3 border-[var(--document-border)] border-t pt-5 text-sm">
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
          <div className="w-64 border-[var(--document-border)] border-t pt-4 text-right">
            <p className="font-[cursive] text-3xl text-[var(--document-foreground)] leading-none">
              {pricing.signerName || model.seller.name || "Signer name"}
            </p>
            <p className="mt-2 font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
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
      className={`flex justify-between ${strong ? "border-t pt-3 font-bold text-lg" : ""}`}
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
