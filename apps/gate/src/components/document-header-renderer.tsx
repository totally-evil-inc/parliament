import { PhotoIcon } from "@heroicons/react/24/outline"
import { formatDateOnly } from "@workspace/document/calculate"
import type { PartySnapshot } from "@workspace/document/schema"
import { stripHtml } from "@workspace/document/text"

export type HeaderLayoutId =
  | "mark-left-dates-right"
  | "centered-stack"
  | "left-stack"
  | "editorial-band"

export type DocumentHeaderProps = {
  kind: "proposal" | "invoice"
  layout?: HeaderLayoutId
  title: string
  issueDate: string
  validUntil?: string
  dueDate?: string
  invoiceNumber?: string
  paymentTerms?: string
  seller: PartySnapshot
  customer: PartySnapshot
  locale?: string
}

export function DocumentHeaderRenderer({
  kind,
  layout = "mark-left-dates-right",
  title,
  issueDate,
  validUntil,
  dueDate,
  invoiceNumber,
  paymentTerms,
  seller,
  customer,
  locale = "en-US",
}: DocumentHeaderProps) {
  const cleanTitle =
    stripHtml(title) || (kind === "proposal" ? "Proposal" : "Invoice")

  const titleElement = (
    <h1 className="font-bold text-3xl text-[var(--document-foreground)] leading-[1.1] tracking-tight [font-family:var(--document-heading-font-family)] sm:text-4xl">
      {cleanTitle}
    </h1>
  )

  const dateItems = (
    <div className="grid gap-3 text-xs sm:text-sm">
      {invoiceNumber && (
        <div>
          <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Invoice No
          </span>
          <span className="font-medium font-mono text-[var(--document-foreground)]">
            {invoiceNumber}
          </span>
        </div>
      )}
      <div>
        <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
          {kind === "proposal" ? "Date" : "Issued"}
        </span>
        <span className="font-medium text-[var(--document-foreground)]">
          {formatDateOnly(issueDate, locale)}
        </span>
      </div>
      {validUntil && (
        <div>
          <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Valid Until
          </span>
          <span className="font-medium text-[var(--document-foreground)]">
            {formatDateOnly(validUntil, locale)}
          </span>
        </div>
      )}
      {dueDate && (
        <div>
          <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Due Date
          </span>
          <span className="font-medium text-[var(--document-foreground)]">
            {formatDateOnly(dueDate, locale)}
          </span>
        </div>
      )}
      {paymentTerms && (
        <div>
          <span className="block font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Terms
          </span>
          <span className="font-medium text-[var(--document-foreground)]">
            {paymentTerms}
          </span>
        </div>
      )}
    </div>
  )

  const partiesGrid = (
    <div className="grid grid-cols-1 gap-8 border-[var(--document-border)] border-t pt-8 md:grid-cols-2 md:gap-12">
      <PartyBlock
        label={kind === "proposal" ? "Prepared By" : "Billed By"}
        party={seller}
      />
      <PartyBlock
        label={kind === "proposal" ? "Prepared For" : "Billed To"}
        party={customer}
      />
    </div>
  )

  return (
    <header className="document-header space-y-[var(--document-section-spacing)] pb-[var(--document-section-spacing)] text-[var(--document-foreground)]">
      {layout === "centered-stack" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <LogoBadge sellerName={seller.name} />
          <div className="flex flex-wrap justify-center gap-6">{dateItems}</div>
          <div className="w-full">{titleElement}</div>
        </div>
      )}

      {layout === "left-stack" && (
        <div className="max-w-3xl space-y-5 text-left">
          <LogoBadge sellerName={seller.name} />
          {titleElement}
          {dateItems}
        </div>
      )}

      {layout === "editorial-band" && (
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
            <LogoBadge sellerName={seller.name} />
            <div className="text-left sm:text-right">{dateItems}</div>
          </div>
          <div className="max-w-3xl">{titleElement}</div>
        </div>
      )}

      {layout === "mark-left-dates-right" && (
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
          <div className="min-w-0 max-w-2xl flex-1 space-y-4">
            <LogoBadge sellerName={seller.name} />
            {titleElement}
          </div>
          <div className="text-left sm:text-right">{dateItems}</div>
        </div>
      )}

      {partiesGrid}
    </header>
  )
}

function LogoBadge({ sellerName }: { sellerName?: string }) {
  const initials = sellerName
    ? sellerName.trim().slice(0, 2).toUpperCase()
    : "PR"
  return (
    <div
      role="img"
      className="flex h-14 w-24 shrink-0 items-center justify-center rounded-[var(--document-radius)] border border-[color-mix(in_oklab,var(--document-accent)_24%,var(--document-border))] bg-[color-mix(in_oklab,var(--document-accent)_8%,transparent)] font-bold text-[var(--document-accent)] text-xs uppercase tracking-widest"
      aria-label="Brand logo"
    >
      <div className="flex items-center gap-1">
        <PhotoIcon className="h-4 w-4" />
        <span>{initials}</span>
      </div>
    </div>
  )
}

function PartyBlock({ label, party }: { label: string; party: PartySnapshot }) {
  return (
    <div className="space-y-1.5 text-sm">
      <h3 className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
        {label}
      </h3>
      <p className="font-semibold text-[var(--document-foreground)] text-base">
        {party.name || "—"}
      </p>
      {party.email && (
        <p className="text-[var(--document-muted-foreground)]">{party.email}</p>
      )}
      {party.phone && (
        <p className="text-[var(--document-muted-foreground)]">{party.phone}</p>
      )}
      {party.address && (
        <p className="whitespace-pre-line text-[var(--document-muted-foreground)]">
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
