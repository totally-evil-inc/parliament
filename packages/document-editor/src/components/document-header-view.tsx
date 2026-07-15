import {
  Calendar03Icon,
  Delete02Icon,
  Image01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import type { PartySnapshot } from "@workspace/document/schema"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { isDocumentHeaderLayoutId } from "../core/header-layouts"
import type { DocumentHeaderLayoutId } from "../core/types"
import {
  useDocumentDraft,
  useDocumentDraftCommands,
  useDocumentEditorHost,
} from "../runtime/react"
import { CanvasRichTextArea, CanvasTextField } from "./canvas-fields"

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function DocumentHeaderView({ node }: NodeViewProps) {
  const { confirm, createId } = useDocumentEditorHost()
  const document = useDocumentDraft()
  const data = document.data
  const commands = useDocumentDraftCommands()
  const layout = isDocumentHeaderLayoutId(node.attrs.headerLayout)
    ? node.attrs.headerLayout
    : "mark-left-dates-right"

  const updateParty = (
    party: "seller" | "customer",
    field: keyof PartySnapshot,
    value: PartySnapshot[keyof PartySnapshot]
  ) => commands.updateParty(party, { [field]: value }, String(field))

  const addCustomField = (party: "seller" | "customer") => {
    const fields = data[party].customFields
    updateParty(party, "customFields", [
      ...fields,
      { id: createId("custom-field"), label: "New Field", value: "" },
    ])
  }

  const removeCustomField = async (
    party: "seller" | "customer",
    index: number
  ) => {
    const confirmed = await confirm({
      title: "Remove custom field?",
      description: `This will remove the selected ${party === "seller" ? "sender" : "recipient"} field.`,
      confirmLabel: "Remove field",
      variant: "destructive",
    })
    if (!confirmed) return
    updateParty(
      party,
      "customFields",
      data[party].customFields.filter(
        (_: unknown, fieldIndex: number) => fieldIndex !== index
      )
    )
  }

  return (
    <NodeViewWrapper
      className="document-header space-y-[var(--document-section-spacing)] pb-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      contentEditable={false}
    >
      <HeaderLayout
        kind={document.kind}
        layout={layout}
        title={data.title}
        date={data.issueDate}
        validUntil={data.validUntil ?? ""}
        dueDate={data.dueDate ?? ""}
        invoiceNumber={data.invoiceNumber ?? ""}
        onTitleChange={commands.setTitle}
        onDateChange={commands.setIssueDate}
        onValidUntilChange={(value) =>
          commands.setValidUntil?.(value || undefined)
        }
        onDueDateChange={commands.setDueDate}
        onInvoiceNumberChange={commands.setInvoiceNumber}
      />

      <div className="grid grid-cols-1 gap-8 border-[var(--document-border)] border-t pt-8 md:grid-cols-2 md:gap-16">
        <PartyFields
          label="From"
          party={data.seller}
          onChange={(field, value) => updateParty("seller", field, value)}
          onAddCustomField={() => addCustomField("seller")}
          onRemoveCustomField={(index) =>
            void removeCustomField("seller", index)
          }
        />
        <PartyFields
          label="Bill To"
          party={data.customer}
          onChange={(field, value) => updateParty("customer", field, value)}
          onAddCustomField={() => addCustomField("customer")}
          onRemoveCustomField={(index) =>
            void removeCustomField("customer", index)
          }
        />
      </div>

      {document.kind === "invoice" && (
        <div className="space-y-2 border-[var(--document-border)] border-t pt-8">
          <div className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Payment Terms
          </div>
          <CanvasTextField
            value={data.paymentTerms ?? ""}
            onValueChange={commands.setPaymentTerms}
            placeholder="e.g. Net 30, payment due upon receipt..."
            className="min-h-[40px] w-full rounded-[var(--document-radius)] border border-[var(--document-border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--document-accent)] focus:outline-none"
          />
        </div>
      )}
    </NodeViewWrapper>
  )
}

function HeaderLayout({
  kind,
  date,
  layout,
  onDateChange,
  onTitleChange,
  validUntil,
  onValidUntilChange,
  dueDate,
  onDueDateChange,
  invoiceNumber,
  onInvoiceNumberChange,
  title,
}: {
  kind: "proposal" | "invoice"
  date: string
  layout: DocumentHeaderLayoutId
  onDateChange: (value: string) => void
  onTitleChange: (value: string) => void
  validUntil?: string
  onValidUntilChange?: (value: string) => void
  dueDate?: string
  onDueDateChange?: (value: string) => void
  invoiceNumber?: string
  onInvoiceNumberChange?: (value: string) => void
  title: string
}) {
  const titleField = (
    <TitleField value={title} onChange={onTitleChange} kind={kind} />
  )
  const dates = (
    <DateFields
      kind={kind}
      date={date}
      validUntil={validUntil}
      dueDate={dueDate}
      invoiceNumber={invoiceNumber}
      onDateChange={onDateChange}
      onValidUntilChange={onValidUntilChange}
      onDueDateChange={onDueDateChange}
      onInvoiceNumberChange={onInvoiceNumberChange}
    />
  )

  if (layout === "centered-stack") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <LogoPlaceholder />
        {dates}
        <div className="w-full">{titleField}</div>
      </div>
    )
  }
  if (layout === "left-stack") {
    return (
      <div className="max-w-3xl space-y-5 text-left">
        <LogoPlaceholder />
        {titleField}
        {dates}
      </div>
    )
  }
  if (layout === "editorial-band") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
          <LogoPlaceholder />
          {dates}
        </div>
        <div className="mx-auto max-w-4xl">{titleField}</div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
      <div className="min-w-0 max-w-4xl flex-1 space-y-6">
        <LogoPlaceholder />
        {titleField}
      </div>
      {dates}
    </div>
  )
}

function TitleField({
  value,
  onChange,
  kind,
}: {
  value: string
  onChange: (value: string) => void
  kind: "proposal" | "invoice"
}) {
  return (
    <CanvasRichTextArea
      aria-label={kind === "proposal" ? "Proposal title" : "Invoice title"}
      className="min-h-12 font-bold text-4xl leading-[1.08] tracking-tight [font-family:var(--document-heading-font-family)]"
      placeholder={
        kind === "proposal" ? "Proposal title..." : "Invoice title..."
      }
      value={value}
      onValueChange={onChange}
    />
  )
}

function LogoPlaceholder() {
  return (
    <button
      type="button"
      className="flex h-16 w-28 shrink-0 items-center justify-center rounded-[var(--document-radius)] border border-[var(--document-border)] border-dashed bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] text-[var(--document-muted-foreground)]"
      aria-label="Logo placeholder"
    >
      <div className="flex flex-col items-center gap-1">
        <HugeiconsIcon icon={Image01Icon} className="h-5 w-5" />
        <span className="font-bold text-[10px] uppercase tracking-widest">
          Logo
        </span>
      </div>
    </button>
  )
}

function DateFields({
  kind,
  date,
  onDateChange,
  validUntil,
  onValidUntilChange,
  dueDate,
  onDueDateChange,
  invoiceNumber,
  onInvoiceNumberChange,
}: {
  kind: "proposal" | "invoice"
  date: string
  onDateChange: (value: string) => void
  validUntil?: string
  onValidUntilChange?: (value: string) => void
  dueDate?: string
  onDueDateChange?: (value: string) => void
  invoiceNumber?: string
  onInvoiceNumberChange?: (value: string) => void
}) {
  if (kind === "invoice") {
    return (
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:w-fit sm:min-w-80 sm:gap-6">
        <div className="space-y-1.5">
          <div className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-wider">
            Invoice Number
          </div>
          <CanvasTextField
            value={invoiceNumber ?? ""}
            onValueChange={onInvoiceNumberChange ?? (() => {})}
            placeholder="INV-0001"
            className="min-h-[36px] w-full rounded-[var(--document-radius)] border border-[var(--document-border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--document-accent)] focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DatePicker label="Date" value={date} onChange={onDateChange} />
          <DatePicker
            label="Due Date"
            value={dueDate ?? ""}
            onChange={onDueDateChange ?? (() => {})}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-4 sm:w-fit sm:min-w-64 sm:gap-6">
      <DatePicker label="Date" value={date} onChange={onDateChange} />
      <DatePicker
        label="Valid Until"
        value={validUntil ?? ""}
        onChange={onValidUntilChange ?? (() => {})}
      />
    </div>
  )
}

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const parsed = parseDate(value)
  return (
    <div className="space-y-1.5">
      <div className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
        {label}
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-0 py-0 font-medium text-sm hover:bg-transparent"
            />
          }
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="h-4 w-4 text-[var(--document-muted-foreground)]"
          />
          <span>{parsed ? dateFormatter.format(parsed) : "Select date"}</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(date) => date && onChange(toDateValue(date))}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function PartyFields({
  label,
  onAddCustomField,
  onChange,
  onRemoveCustomField,
  party,
}: {
  label: string
  onAddCustomField: () => void
  onChange: (
    field: keyof PartySnapshot,
    value: PartySnapshot[keyof PartySnapshot]
  ) => void
  onRemoveCustomField: (index: number) => void
  party: PartySnapshot
}) {
  return (
    <section className="space-y-6">
      <div className="font-bold text-[10px] text-[var(--document-muted-foreground)] uppercase tracking-widest">
        {label}
      </div>
      <div className="space-y-3">
        <PartyInput
          placeholder="Name"
          value={party.name}
          onChange={(value) => onChange("name", value)}
        />
        <PartyInput
          placeholder="Email"
          value={party.email}
          onChange={(value) => onChange("email", value)}
        />
        <PartyInput
          multiline
          placeholder="Address"
          value={party.address}
          onChange={(value) => onChange("address", value)}
        />
        <PartyInput
          placeholder="Phone"
          value={party.phone}
          onChange={(value) => onChange("phone", value)}
        />
        <PartyInput
          placeholder="Website"
          value={party.website}
          onChange={(value) => onChange("website", value)}
        />
        <PartyInput
          placeholder="Tax ID / VAT"
          value={party.taxId}
          onChange={(value) => onChange("taxId", value)}
        />
        {party.customFields.map((field, index) => (
          <div
            key={field.id}
            className="group grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)_auto] items-center gap-2"
          >
            <PartyInput
              placeholder="Label"
              value={field.label}
              onChange={(value) =>
                onChange(
                  "customFields",
                  party.customFields.map((current, fieldIndex) =>
                    fieldIndex === index
                      ? { ...current, label: value }
                      : current
                  )
                )
              }
            />
            <PartyInput
              placeholder="Value"
              value={field.value}
              onChange={(value) =>
                onChange(
                  "customFields",
                  party.customFields.map((current, fieldIndex) =>
                    fieldIndex === index ? { ...current, value } : current
                  )
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemoveCustomField(index)}
              aria-label="Remove custom field"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddCustomField}
          className="h-7 gap-1.5 px-2 font-bold text-[10px] uppercase tracking-wider"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
          Add Field
        </Button>
      </div>
    </section>
  )
}

function PartyInput({
  className = "",
  multiline = false,
  placeholder,
  value,
  onChange,
}: {
  className?: string
  multiline?: boolean
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  const props = {
    "aria-label": placeholder,
    className,
    placeholder,
    value,
    onValueChange: onChange,
  }

  return multiline ? (
    <CanvasRichTextArea {...props} />
  ) : (
    <CanvasTextField {...props} />
  )
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : undefined
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export { DocumentHeaderView }
export default DocumentHeaderView
