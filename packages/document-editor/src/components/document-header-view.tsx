import {
  Calendar03Icon,
  Delete02Icon,
  Image01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  useProposalDraftCommands,
  useProposalDraftSelector,
} from "../runtime/react"
import type { PartySnapshot } from "@workspace/document/schema"
import type { NodeViewProps } from "@tiptap/react"
import type { DocumentHeaderLayoutId } from "../core/types"

import { CanvasTextArea, CanvasTextField } from "./canvas-fields"
import { isDocumentHeaderLayoutId } from "../core/header-layouts"
import { useDocumentEditorHost } from "../runtime/react"

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function DocumentHeaderView({ node }: NodeViewProps) {
  const { confirm, createId } = useDocumentEditorHost()
  const data = useProposalDraftSelector((document) => document.data)
  const commands = useProposalDraftCommands()
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
      data[party].customFields.filter((_, fieldIndex) => fieldIndex !== index)
    )
  }

  return (
    <NodeViewWrapper
      className="document-header space-y-[var(--document-section-spacing)] pb-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      contentEditable={false}
    >
      <HeaderLayout
        layout={layout}
        title={data.title}
        date={data.issueDate}
        validUntil={data.validUntil ?? ""}
        onTitleChange={commands.setTitle}
        onDateChange={commands.setIssueDate}
        onValidUntilChange={(value) =>
          commands.setValidUntil(value || undefined)
        }
      />

      <div className="grid grid-cols-2 gap-16 border-t border-[var(--document-border)] pt-8">
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
    </NodeViewWrapper>
  )
}

function HeaderLayout({
  date,
  layout,
  onDateChange,
  onTitleChange,
  onValidUntilChange,
  title,
  validUntil,
}: {
  date: string
  layout: DocumentHeaderLayoutId
  onDateChange: (value: string) => void
  onTitleChange: (value: string) => void
  onValidUntilChange: (value: string) => void
  title: string
  validUntil: string
}) {
  const titleField = <TitleField value={title} onChange={onTitleChange} />
  const dates = (
    <DateFields
      date={date}
      validUntil={validUntil}
      onDateChange={onDateChange}
      onValidUntilChange={onValidUntilChange}
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
        <div className="flex items-start justify-between gap-8">
          <LogoPlaceholder />
          {dates}
        </div>
        <div className="mx-auto max-w-4xl">{titleField}</div>
      </div>
    )
  }
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="max-w-4xl min-w-0 flex-1 space-y-6">
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
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <CanvasTextArea
      aria-label="Proposal title"
      className="min-h-12 [font-family:var(--document-heading-font-family)] text-4xl leading-[1.08] font-bold tracking-tight"
      maxRows={3}
      placeholder="Proposal title..."
      value={value}
      onValueChange={onChange}
    />
  )
}

function LogoPlaceholder() {
  return (
    <button
      type="button"
      className="flex h-16 w-28 shrink-0 items-center justify-center rounded-[var(--document-radius)] border border-dashed border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] text-[var(--document-muted-foreground)]"
      aria-label="Logo placeholder"
    >
      <div className="flex flex-col items-center gap-1">
        <HugeiconsIcon icon={Image01Icon} className="h-5 w-5" />
        <span className="text-[10px] font-bold tracking-widest uppercase">
          Logo
        </span>
      </div>
    </button>
  )
}

function DateFields({
  date,
  onDateChange,
  onValidUntilChange,
  validUntil,
}: {
  date: string
  onDateChange: (value: string) => void
  onValidUntilChange: (value: string) => void
  validUntil: string
}) {
  return (
    <div className="grid w-fit min-w-64 grid-cols-2 gap-6">
      <DatePicker label="Date" value={date} onChange={onDateChange} />
      <DatePicker
        label="Valid Until"
        value={validUntil}
        onChange={onValidUntilChange}
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
      <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-0 py-0 text-sm font-medium hover:bg-transparent"
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
      <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </div>
      <div className="space-y-3">
        <PartyInput
          className="text-lg font-semibold"
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
            className="group grid grid-cols-[0.4fr_0.6fr_auto] items-center gap-2"
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
          className="h-7 gap-1.5 px-2 text-[10px] font-bold tracking-wider uppercase"
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
    <CanvasTextArea {...props} maxRows={3} />
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
