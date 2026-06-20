import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import { getDocumentTemplateStyle } from "@workspace/document/presentation"
import { RichTextRenderer } from "./rich-text-renderer"
import type { DocumentBlock } from "@workspace/document/schema"
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
    block.type === "pricing" ? <Pricing model={model} /> : null,
  richText: ({ block }) =>
    block.type === "richText" ? (
      <RichTextRenderer
        className="prose prose-sm max-w-none text-[var(--document-foreground)]"
        content={block.content}
      />
    ) : null,
  timeline: ({ block }) =>
    block.type === "timeline" ? (
      <section className="my-6 border-l border-[var(--document-border)] pl-4">
        <RichTextRenderer content={block.content} />
      </section>
    ) : null,
  metrics: ({ block }) =>
    block.type === "metrics" ? (
      <section className={`my-8 grid gap-8 ${columns(block.columns)}`}>
        {block.metrics.map((metric) => (
          <div key={metric.id} className="break-inside-avoid text-center">
            <p className="text-5xl font-black text-[var(--document-accent)]">
              {metric.value}
            </p>
            <p className="mt-1 text-lg font-bold">{metric.label}</p>
            {metric.detail ? (
              <p className="mt-2 text-[var(--document-muted-foreground)]">
                {metric.detail}
              </p>
            ) : null}
          </div>
        ))}
      </section>
    ) : null,
  team: ({ block }) =>
    block.type === "team" ? (
      <section className={`my-8 grid gap-8 ${columns(block.columns)}`}>
        {block.members.map((member) => (
          <div key={member.id} className="break-inside-avoid text-center">
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-2xl font-bold text-[var(--document-accent)]">
              {member.name.slice(0, 1)}
            </div>
            <p className="text-lg font-bold">{member.name}</p>
            <p className="text-[var(--document-muted-foreground)]">
              {member.role}
            </p>
            {member.bio ? (
              <p className="mt-3 text-sm text-[var(--document-muted-foreground)]">
                {member.bio}
              </p>
            ) : null}
          </div>
        ))}
      </section>
    ) : null,
  testimonials: ({ block }) =>
    block.type === "testimonials" ? (
      <section className={`my-8 grid gap-8 ${columns(block.columns)}`}>
        {block.testimonials.map((item) => (
          <blockquote
            key={item.id}
            className="break-inside-avoid border-l-2 border-[var(--document-accent)] pl-5"
          >
            <p className="text-lg text-[var(--document-muted-foreground)] italic">
              {item.content}
            </p>
            <footer className="mt-4 font-bold">{item.author}</footer>
            <p className="text-sm text-[var(--document-muted-foreground)]">
              {item.role}
            </p>
          </blockquote>
        ))}
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
      className="min-h-screen bg-[var(--document-canvas-background)] text-[var(--document-foreground)] print:bg-transparent"
      style={getDocumentTemplateStyle(template)}
      data-document-template={`${model.template.id}@${model.template.version}`}
      data-document-type="proposal"
    >
      <article className="mx-auto min-h-[297mm] w-[210mm] bg-[var(--document-page-background)] px-[18mm] py-[18mm] [font-family:var(--document-font-family)] print:min-h-0 print:w-auto print:px-0 print:py-0">
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
    <header className="break-inside-avoid space-y-8 pb-8">
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-6">
          <div className="flex h-16 w-28 items-center justify-center rounded-[var(--document-radius)] border border-[var(--document-border)] text-xs text-[var(--document-muted-foreground)]">
            Logo
          </div>
          <h1 className="text-4xl font-bold">{model.title || "Proposal"}</h1>
        </div>
        <div className="grid gap-3 text-right text-sm">
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
      <div className="grid grid-cols-2 gap-16 border-t border-[var(--document-border)] pt-8">
        <Party label="From" party={model.seller} />
        <Party label="Bill To" party={model.customer} />
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
        .map(([key, value]) => (
          <p key={key}>{value}</p>
        ))}
      {party.customFields.map((field) => (
        <p key={field.id}>
          <strong>{field.label}:</strong> {field.value}
        </p>
      ))}
    </section>
  )
}

function Pricing({ model }: { model: ProposalRenderModel }) {
  const pricing = model.pricing
  if (!pricing) return null
  const money = (value: number) =>
    formatMoneyMinor(value, pricing.currency, model.locale)
  return (
    <section className="my-8">
      <div className="border-b border-[var(--document-border)] pb-4">
        <h2 className="text-xs font-bold tracking-[0.16em] uppercase">
          Services & Billing
        </h2>
        <p className="mt-1.5 text-xs text-[var(--document-muted-foreground)]">
          Indicative proposal pricing
        </p>
      </div>
      <div className="pt-5">
        <table className="w-full">
          <thead>
            <tr className="border-y border-[var(--document-border)] text-left text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
              <th className="py-3 pr-5">Description</th>
              <th className="px-3 py-3 text-center">Qty</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pricing.items.map((item, index) => (
              <tr
                key={item.id}
                className="break-inside-avoid border-b border-[var(--document-border)] align-top"
              >
                <td className="py-5 pr-5">
                  <p className="font-medium">{item.description}</p>
                  {item.details ? (
                    <p className="text-sm text-[var(--document-muted-foreground)]">
                      {item.details}
                    </p>
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
