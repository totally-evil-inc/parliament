import { RichTextRenderer } from "./rich-text-renderer"
import { getDocumentTemplateStyle } from "@/features/documents/editor/templates"
import {
  money,
  safeNumber,
} from "@/features/documents/components/line-items-view/pricing"
import type { PricingItem } from "@/features/documents/components/line-items-view/pricing"
import type {
  DocumentHeaderCustomField,
  DocumentSnapshot,
} from "@/features/documents/editor/types"
import type {
  GalleryImage,
  KeyNumberMetric,
  TeamMember,
  Testimonial,
} from "@/features/proposals/types"
import type { JSONContent } from "@tiptap/core"

type NodeAttrs = Record<string, unknown>

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function DocumentPrintView({
  snapshot,
}: {
  snapshot: DocumentSnapshot
}) {
  const style = getDocumentTemplateStyle(snapshot.template)

  return (
    <main
      className="document-print-canvas min-h-screen bg-[var(--document-canvas-background)] py-0 text-[var(--document-foreground)] print:bg-transparent print:p-0"
      style={style}
      data-document-renderer={snapshot.rendererVersion}
      data-document-template={snapshot.template.id}
      data-document-type={snapshot.documentType}
    >
      <article className="document-print-page mx-auto min-h-[297mm] w-[210mm] bg-[var(--document-page-background)] px-[18mm] py-[18mm] [font-family:var(--document-font-family)] print:m-0 print:min-h-0 print:w-auto print:px-0 print:py-0">
        {(snapshot.content.content ?? []).map((node, index) => (
          <PrintNode key={index} node={node} renderData={snapshot.renderData} />
        ))}
      </article>
    </main>
  )
}

function PrintNode({
  node,
  renderData,
}: {
  node: JSONContent
  renderData: DocumentSnapshot["renderData"]
}) {
  const attrs = (node.attrs ?? {}) as NodeAttrs

  if (node.type === "documentHeader") {
    return <DocumentHeaderPrint attrs={attrs} renderData={renderData} />
  }
  if (node.type === "lineItems") {
    return <LineItemsPrint attrs={attrs} renderData={renderData} />
  }
  if (node.type === "keyNumbers") return <KeyNumbersPrint attrs={attrs} />
  if (node.type === "teamMembers") return <TeamMembersPrint attrs={attrs} />
  if (node.type === "testimonials") return <TestimonialsPrint attrs={attrs} />
  if (node.type === "gallery") return <GalleryPrint attrs={attrs} />
  if (node.type === "timeline") return <TimelinePrint node={node} />

  return (
    <RichTextRenderer
      className="prose prose-sm max-w-none text-[var(--document-foreground)] prose-headings:[font-family:var(--document-heading-font-family)] prose-p:text-[var(--document-foreground)] prose-strong:text-[var(--document-foreground)]"
      content={node}
    />
  )
}

function DocumentHeaderPrint({
  attrs,
  renderData,
}: {
  attrs: NodeAttrs
  renderData: DocumentSnapshot["renderData"]
}) {
  const date = stringAttr(attrs.date) || renderData.issueDate || ""
  const due =
    stringAttr(attrs.due) ||
    stringAttr(attrs.validUntil) ||
    renderData.dueDate ||
    ""
  const fromFields = getCustomFields(attrs.fromCustomFields)
  const billToFields = getCustomFields(attrs.billToCustomFields)

  return (
    <header className="document-header break-inside-avoid space-y-[var(--document-section-spacing)] pb-[var(--document-section-spacing)]">
      <div className="flex items-start justify-between gap-8">
        <div className="max-w-4xl space-y-6">
          <div className="flex h-16 w-28 items-center justify-center rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
            Logo
          </div>
          <RichTextRenderer
            className="document-rich-text [font-family:var(--document-heading-font-family)] text-4xl leading-tight font-bold tracking-tight text-[var(--document-foreground)] [&_p]:m-0"
            content={jsonAttr(attrs.titleContent)}
            fallback={stringAttr(attrs.title)}
          />
        </div>
        <div className="grid w-fit min-w-32 gap-3 text-right">
          <DatePrint label="Date" value={date} />
          <DatePrint label="Due" value={due} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 border-t border-[var(--document-border)] pt-8">
        <AddressPrint
          label="From"
          fields={[
            [attrs.fromNameContent, attrs.fromName, "text-lg font-semibold"],
            [attrs.fromEmailContent, attrs.fromEmail],
            [attrs.fromAddressContent, attrs.fromAddress],
            [attrs.fromPhoneContent, attrs.fromPhone],
            [attrs.fromWebsiteContent, attrs.fromWebsite],
            [attrs.fromTaxIdContent, attrs.fromTaxId],
          ]}
          customFields={fromFields}
        />
        <AddressPrint
          label="Bill To"
          fields={[
            [
              attrs.billToNameContent,
              attrs.billToName,
              "text-lg font-semibold",
            ],
            [attrs.billToEmailContent, attrs.billToEmail],
            [attrs.billToAddressContent, attrs.billToAddress],
            [attrs.billToPhoneContent, attrs.billToPhone],
            [attrs.billToWebsiteContent, attrs.billToWebsite],
            [attrs.billToTaxIdContent, attrs.billToTaxId],
          ]}
          customFields={billToFields}
        />
      </div>
    </header>
  )
}

function DatePrint({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </div>
      <div className="text-sm font-medium text-[var(--document-foreground)]">
        {formatDate(value)}
      </div>
    </div>
  )
}

function AddressPrint({
  customFields,
  fields,
  label,
}: {
  customFields: Array<DocumentHeaderCustomField>
  fields: Array<[unknown, unknown, string?]>
  label: string
}) {
  return (
    <section className="break-inside-avoid space-y-6">
      <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </div>
      <div className="space-y-3 text-sm">
        {fields.map(([content, fallback, className], index) => (
          <RichTextRenderer
            key={index}
            className={`document-rich-text text-[var(--document-foreground)] [&_p]:m-0 ${className ?? ""}`}
            content={jsonAttr(content)}
            fallback={stringAttr(fallback)}
          />
        ))}
        {customFields.map((field) => (
          <div
            key={field.id}
            className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-2"
          >
            <RichTextRenderer
              className="document-rich-text text-xs font-bold tracking-wider text-[var(--document-muted-foreground)] [&_p]:m-0"
              content={field.labelContent}
              fallback={field.label}
            />
            <RichTextRenderer
              className="document-rich-text text-[var(--document-foreground)] [&_p]:m-0"
              content={field.valueContent}
              fallback={field.value}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function LineItemsPrint({
  attrs,
  renderData,
}: {
  attrs: NodeAttrs
  renderData: DocumentSnapshot["renderData"]
}) {
  const items = Array.isArray(attrs.items)
    ? (attrs.items as Array<PricingItem>)
    : []
  const discountEnabled = attrs.discountEnabled === true
  const taxEnabled = attrs.taxEnabled === true
  const discountRate = safeNumber(attrs.discountRate)
  const taxRate = safeNumber(attrs.taxRate)
  const subtotal = items.reduce(
    (acc, item) => acc + safeNumber(item.quantity) * safeNumber(item.rate),
    0
  )
  const discountAmount = discountEnabled ? subtotal * (discountRate / 100) : 0
  const taxableAmount = Math.max(subtotal - discountAmount, 0)
  const taxAmount = taxEnabled ? taxableAmount * (taxRate / 100) : 0
  const total = taxableAmount + taxAmount
  const signerName = stringAttr(attrs.signerName) || renderData.signerName || ""
  const signerTitle =
    stringAttr(attrs.signerTitle) || renderData.signerTitle || "Signature"

  return (
    <section className="document-line-items my-[var(--document-section-spacing)] overflow-hidden rounded-[var(--document-radius)] border border-[var(--document-border)] bg-[var(--document-page-background)] text-[var(--document-foreground)]">
      <div className="break-inside-avoid bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] px-6 py-4">
        <h3 className="text-sm font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
          Services & Billing
        </h3>
      </div>
      <div className="p-6">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="break-inside-avoid bg-[color-mix(in_oklab,var(--document-accent)_5%,transparent)] text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
              <th className="rounded-l-md px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="rounded-r-md px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const amount = safeNumber(item.quantity) * safeNumber(item.rate)
              return (
                <tr
                  key={item.id || index}
                  className="break-inside-avoid align-top"
                >
                  <td className="px-4 py-5">
                    <p className="font-medium">{item.description}</p>
                    {item.details ? (
                      <p className="mt-2 text-sm text-[var(--document-muted-foreground)]">
                        {item.details}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-5 text-center">
                    {safeNumber(item.quantity)}
                  </td>
                  <td className="px-4 py-5 text-right">
                    {money(safeNumber(item.rate))}
                  </td>
                  <td className="px-4 py-5 text-right font-bold">
                    {money(amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-10 grid gap-8 border-t border-[var(--document-border)] pt-8 md:grid-cols-[1fr_28rem]">
          <div className="space-y-3 text-sm text-[var(--document-muted-foreground)]">
            <p className="font-medium text-[var(--document-foreground)]">
              Billing notes
            </p>
            <p>
              Use this section to confirm the services, quantities, pricing,
              discounts, and taxes included in this document.
            </p>
          </div>
          <div className="break-inside-avoid space-y-4">
            <TotalRow label="Subtotal" value={money(subtotal)} />
            {discountEnabled ? (
              <TotalRow
                label={`Discount (${discountRate}%)`}
                value={money(-discountAmount)}
              />
            ) : null}
            {taxEnabled ? (
              <TotalRow label={`Tax (${taxRate}%)`} value={money(taxAmount)} />
            ) : null}
            <div className="flex items-center justify-between border-t border-[var(--document-border)] pt-4">
              <span className="text-lg font-bold">Total</span>
              <span className="text-3xl font-bold tracking-tight">
                {money(total)}
              </span>
            </div>
            <div className="pt-8 text-right">
              <p className="font-[cursive] text-3xl leading-none text-[var(--document-foreground)]">
                {signerName || "Signer name"}
              </p>
              <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
                {signerTitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--document-muted-foreground)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function KeyNumbersPrint({ attrs }: { attrs: NodeAttrs }) {
  const metrics = Array.isArray(attrs.metrics)
    ? (attrs.metrics as Array<KeyNumberMetric>)
    : []
  const columns = getColumns(attrs.columns)

  return (
    <section
      className={`key-numbers my-[var(--document-section-spacing)] grid gap-x-16 gap-y-14 ${columnsClass(columns)}`}
    >
      {metrics.map((metric) => (
        <div key={metric.id} className="break-inside-avoid text-center">
          <p className="text-5xl font-black tracking-tight text-[var(--document-accent)]">
            {metric.value}
          </p>
          <p className="mt-1 text-lg font-bold text-[var(--document-foreground)]">
            {metric.label}
          </p>
          {metric.detail ? (
            <p className="mt-2 text-lg leading-relaxed text-[var(--document-muted-foreground)]">
              {metric.detail}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function TeamMembersPrint({ attrs }: { attrs: NodeAttrs }) {
  const members = Array.isArray(attrs.members)
    ? (attrs.members as Array<TeamMember>)
    : []
  const columns = getColumns(attrs.columns)

  return (
    <section
      className={`team-members my-[var(--document-section-spacing)] grid gap-x-10 gap-y-10 ${columnsClass(columns)}`}
    >
      {members.map((member) => (
        <div key={member.id} className="break-inside-avoid text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--document-accent)_10%,transparent)] text-[var(--document-accent)]">
            <span className="text-2xl font-bold">
              {member.name.slice(0, 1)}
            </span>
          </div>
          <p className="text-lg font-bold">{member.name}</p>
          <p className="mt-1.5 text-base font-medium text-[var(--document-muted-foreground)]">
            {member.role}
          </p>
          {member.bio ? (
            <p className="mt-3 text-base leading-normal text-[var(--document-muted-foreground)]">
              {member.bio}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function TestimonialsPrint({ attrs }: { attrs: NodeAttrs }) {
  const testimonials = Array.isArray(attrs.testimonials)
    ? (attrs.testimonials as Array<Testimonial>)
    : []
  const columns = getColumns(attrs.columns)

  return (
    <section
      className={`testimonials my-[var(--document-section-spacing)] grid gap-x-10 gap-y-10 ${columnsClass(columns)}`}
    >
      {testimonials.map((testimonial) => (
        <blockquote
          key={testimonial.id}
          className="m-0 break-inside-avoid border-l-2 border-[var(--document-accent)] py-1 pl-5"
        >
          <p className="text-lg leading-relaxed font-medium text-[var(--document-muted-foreground)] italic">
            {testimonial.content}
          </p>
          <footer className="mt-4">
            <p className="font-bold">{testimonial.author}</p>
            <p className="mt-1 text-sm font-medium text-[var(--document-muted-foreground)]">
              {testimonial.role}
            </p>
          </footer>
        </blockquote>
      ))}
    </section>
  )
}

function GalleryPrint({ attrs }: { attrs: NodeAttrs }) {
  const images = Array.isArray(attrs.images)
    ? (attrs.images as Array<GalleryImage>)
    : []
  const columns = getColumns(attrs.columns)

  return (
    <section
      className={`gallery my-[var(--document-section-spacing)] grid gap-4 ${columnsClass(columns)}`}
    >
      {images.map((image) => (
        <div
          key={image.id}
          className="aspect-square break-inside-avoid overflow-hidden rounded-[var(--document-radius)] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)]"
        >
          {image.url ? (
            <img
              className="h-full w-full object-cover"
              src={image.url}
              alt={image.alt}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-medium tracking-wider text-[var(--document-muted-foreground)] uppercase">
              Placeholder
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function TimelinePrint({ node }: { node: JSONContent }) {
  return (
    <section className="timeline my-6 space-y-6">
      {(node.content ?? []).map((item, index) => (
        <div
          key={index}
          className="break-inside-avoid border-l border-[var(--document-border)] pl-4"
        >
          {(item.content ?? []).map((child, childIndex) => (
            <PrintNode key={childIndex} node={child} renderData={{}} />
          ))}
        </div>
      ))}
    </section>
  )
}

function formatDate(value: string) {
  if (!value) return ""
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function getCustomFields(value: unknown): Array<DocumentHeaderCustomField> {
  return Array.isArray(value) ? (value as Array<DocumentHeaderCustomField>) : []
}

function stringAttr(value: unknown) {
  return typeof value === "string" ? value : ""
}

function jsonAttr(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as JSONContent)
    : undefined
}

function getColumns(value: unknown) {
  return value === 1 || value === 2 || value === 3 ? value : 3
}

function columnsClass(columns: 1 | 2 | 3) {
  if (columns === 1) return "grid-cols-1"
  if (columns === 2) return "grid-cols-2"
  return "grid-cols-3"
}
