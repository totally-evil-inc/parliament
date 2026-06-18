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
  Editable,
  EditableArea,
  EditableInput,
  EditablePreview,
} from "@workspace/ui/components/editable"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useEffect, useRef } from "react"
import type { NodeViewProps } from "@tiptap/react"
import type {
  DocumentHeaderAttrs,
  DocumentHeaderCustomField,
  DocumentHeaderLayoutId,
} from "@/features/documents/editor/types"
import { isDocumentHeaderLayoutId } from "@/features/documents/editor/header-layouts"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { createId } from "@/lib/create-id"

type DateFieldKey = "date" | "due" | "validUntil"

const headerDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function getCustomFields(value: unknown): Array<DocumentHeaderCustomField> {
  return Array.isArray(value)
    ? value
        .filter(
          (field): field is DocumentHeaderCustomField =>
            typeof field === "object" &&
            field !== null &&
            "label" in field &&
            "value" in field
        )
        .map((field) => ({
          id:
            typeof field.id === "string" && field.id
              ? field.id
              : `custom-field-${field.label}-${field.value}`,
          label: field.label,
          value: field.value,
        }))
    : []
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return undefined
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDate(value: unknown) {
  const date = parseDate(value)

  return date ? headerDateFormatter.format(date) : "Select date"
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getHeaderAttrs(attrs: Record<string, unknown>): DocumentHeaderAttrs {
  return {
    headerLayout: isDocumentHeaderLayoutId(attrs.headerLayout)
      ? attrs.headerLayout
      : "mark-left-dates-right",
    title: typeof attrs.title === "string" ? attrs.title : "",
    date: typeof attrs.date === "string" ? attrs.date : "",
    due: typeof attrs.due === "string" ? attrs.due : "",
    validUntil: typeof attrs.validUntil === "string" ? attrs.validUntil : "",
    fromName: typeof attrs.fromName === "string" ? attrs.fromName : "",
    fromEmail: typeof attrs.fromEmail === "string" ? attrs.fromEmail : "",
    fromAddress: typeof attrs.fromAddress === "string" ? attrs.fromAddress : "",
    fromPhone: typeof attrs.fromPhone === "string" ? attrs.fromPhone : "",
    fromWebsite: typeof attrs.fromWebsite === "string" ? attrs.fromWebsite : "",
    fromTaxId: typeof attrs.fromTaxId === "string" ? attrs.fromTaxId : "",
    fromCustomFields: getCustomFields(attrs.fromCustomFields),
    billToName: typeof attrs.billToName === "string" ? attrs.billToName : "",
    billToEmail: typeof attrs.billToEmail === "string" ? attrs.billToEmail : "",
    billToAddress:
      typeof attrs.billToAddress === "string" ? attrs.billToAddress : "",
    billToPhone: typeof attrs.billToPhone === "string" ? attrs.billToPhone : "",
    billToWebsite:
      typeof attrs.billToWebsite === "string" ? attrs.billToWebsite : "",
    billToTaxId: typeof attrs.billToTaxId === "string" ? attrs.billToTaxId : "",
    billToCustomFields: getCustomFields(attrs.billToCustomFields),
  }
}

function DocumentHeaderView({ node, updateAttributes }: NodeViewProps) {
  const confirm = useConfirm()
  const {
    title,
    headerLayout,
    date,
    due,
    validUntil,
    fromName,
    fromEmail,
    fromAddress,
    fromPhone,
    fromWebsite,
    fromTaxId,
    fromCustomFields,
    billToName,
    billToEmail,
    billToAddress,
    billToPhone,
    billToWebsite,
    billToTaxId,
    billToCustomFields,
  } = getHeaderAttrs(node.attrs)
  const dueDate = due || validUntil

  const handleChange = (key: string, value: string) => {
    updateAttributes({ [key]: value })
  }

  const handleDateChange = (key: DateFieldKey, value: string) => {
    updateAttributes(
      key === "due" ? { due: value, validUntil: value } : { [key]: value }
    )
  }

  const addCustomField = (key: "fromCustomFields" | "billToCustomFields") => {
    const fields =
      key === "fromCustomFields" ? fromCustomFields : billToCustomFields

    updateAttributes({
      [key]: [
        ...fields,
        { id: createId("custom-field"), label: "New Field", value: "" },
      ],
    })
  }

  const updateCustomField = (
    key: "fromCustomFields" | "billToCustomFields",
    index: number,
    fieldKey: keyof DocumentHeaderCustomField,
    value: string
  ) => {
    const fields =
      key === "fromCustomFields" ? fromCustomFields : billToCustomFields

    updateAttributes({
      [key]: fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [fieldKey]: value } : field
      ),
    })
  }

  const removeCustomField = async (
    key: "fromCustomFields" | "billToCustomFields",
    index: number
  ) => {
    const fields =
      key === "fromCustomFields" ? fromCustomFields : billToCustomFields

    const confirmed = await confirm({
      title: "Remove custom field?",
      description:
        key === "fromCustomFields"
          ? "This will remove the selected sender field."
          : "This will remove the selected recipient field.",
      confirmLabel: "Remove field",
      variant: "destructive",
    })

    if (!confirmed) return

    updateAttributes({
      [key]: fields.filter((_, fieldIndex) => fieldIndex !== index),
    })
  }

  return (
    <NodeViewWrapper
      className="document-header space-y-[var(--document-section-spacing)] pb-[var(--document-section-spacing)] text-[var(--document-foreground)]"
      contentEditable={false}
    >
      <HeaderLayout
        layout={headerLayout}
        title={title}
        date={date}
        dueDate={dueDate}
        onDateChange={(value) => handleDateChange("date", value)}
        onDueDateChange={(value) => handleDateChange("due", value)}
        onTitleChange={(value) => handleChange("title", value)}
      />

      <div className="grid grid-cols-2 gap-16 border-t border-[var(--document-border)] pt-8">
        <div className="space-y-6">
          <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
            From
          </div>
          <div className="space-y-3">
            <Field
              placeholder="Your business name"
              value={fromName}
              onChange={(v) => handleChange("fromName", v)}
              className="text-lg font-semibold"
            />
            <Field
              placeholder="email@company.com"
              value={fromEmail}
              onChange={(v) => handleChange("fromEmail", v)}
            />
            <Field
              placeholder="Street address, City, State, ZIP"
              value={fromAddress}
              onChange={(v) => handleChange("fromAddress", v)}
            />
            <Field
              placeholder="Phone"
              value={fromPhone}
              onChange={(v) => handleChange("fromPhone", v)}
            />
            <Field
              placeholder="Website"
              value={fromWebsite}
              onChange={(v) => handleChange("fromWebsite", v)}
            />
            <Field
              placeholder="Tax ID / VAT"
              value={fromTaxId}
              onChange={(v) => handleChange("fromTaxId", v)}
            />

            <CustomFields
              fields={fromCustomFields}
              onChange={(index, fieldKey, value) =>
                updateCustomField("fromCustomFields", index, fieldKey, value)
              }
              onRemove={(index) =>
                void removeCustomField("fromCustomFields", index)
              }
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addCustomField("fromCustomFields")}
              className="h-7 gap-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase hover:bg-muted"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
              Add Field
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
            Bill To
          </div>
          <div className="space-y-3">
            <Field
              placeholder="Search or type customer name"
              value={billToName}
              onChange={(v) => handleChange("billToName", v)}
              className="text-lg font-semibold"
            />
            <Field
              placeholder="client@email.com"
              value={billToEmail}
              onChange={(v) => handleChange("billToEmail", v)}
            />
            <Field
              placeholder="Client address, City, State, ZIP"
              value={billToAddress}
              onChange={(v) => handleChange("billToAddress", v)}
            />
            <Field
              placeholder="Phone number"
              value={billToPhone}
              onChange={(v) => handleChange("billToPhone", v)}
            />
            <Field
              placeholder="Website"
              value={billToWebsite}
              onChange={(v) => handleChange("billToWebsite", v)}
            />
            <Field
              placeholder="Tax ID / VAT Number"
              value={billToTaxId}
              onChange={(v) => handleChange("billToTaxId", v)}
            />

            <CustomFields
              fields={billToCustomFields}
              onChange={(index, fieldKey, value) =>
                updateCustomField("billToCustomFields", index, fieldKey, value)
              }
              onRemove={(index) =>
                void removeCustomField("billToCustomFields", index)
              }
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addCustomField("billToCustomFields")}
              className="h-7 gap-1.5 px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase hover:bg-muted"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
              Add Field
            </Button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export { DocumentHeaderView }
export default DocumentHeaderView

function HeaderLayout({
  date,
  dueDate,
  layout,
  onDateChange,
  onDueDateChange,
  onTitleChange,
  title,
}: {
  date: string
  dueDate: string
  layout: DocumentHeaderLayoutId
  onDateChange: (value: string) => void
  onDueDateChange: (value: string) => void
  onTitleChange: (value: string) => void
  title: string
}) {
  const logo = <LogoPlaceholder />
  const titleField = (
    <DocumentTitleField value={title} onChange={onTitleChange} />
  )
  const centeredTitleField = (
    <DocumentTitleField align="center" value={title} onChange={onTitleChange} />
  )
  const datesHorizontal = (
    <DateFields
      align="left"
      date={date}
      dueDate={dueDate}
      onDateChange={onDateChange}
      onDueDateChange={onDueDateChange}
      orientation="horizontal"
    />
  )
  const datesVertical = (
    <DateFields
      align="right"
      date={date}
      dueDate={dueDate}
      onDateChange={onDateChange}
      onDueDateChange={onDueDateChange}
      orientation="vertical"
    />
  )

  if (layout === "centered-stack") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        {logo}
        <DateFields
          align="center"
          date={date}
          dueDate={dueDate}
          onDateChange={onDateChange}
          onDueDateChange={onDueDateChange}
          orientation="horizontal"
        />
        <div className="w-full">{centeredTitleField}</div>
      </div>
    )
  }

  if (layout === "left-stack") {
    return (
      <div className="max-w-3xl space-y-5 text-left">
        {logo}
        {titleField}
        {datesHorizontal}
      </div>
    )
  }

  if (layout === "editorial-band") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-8">
          {logo}
          {datesVertical}
        </div>
        <div className="mx-auto max-w-4xl">{centeredTitleField}</div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-8">
      <div className="max-w-4xl space-y-6 text-left">
        {logo}
        {titleField}
      </div>
      {datesVertical}
    </div>
  )
}

function LogoPlaceholder() {
  return (
    <button
      type="button"
      className="flex h-16 w-28 shrink-0 items-center justify-center rounded-[var(--document-radius)] border border-dashed border-[var(--document-border)] bg-[color-mix(in_oklab,var(--document-accent)_6%,transparent)] text-[var(--document-muted-foreground)] transition-colors hover:border-[var(--document-accent)] hover:text-[var(--document-accent)]"
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
  align,
  date,
  dueDate,
  onDateChange,
  onDueDateChange,
  orientation,
}: {
  align: "left" | "center" | "right"
  date: string
  dueDate: string
  onDateChange: (value: string) => void
  onDueDateChange: (value: string) => void
  orientation: "horizontal" | "vertical"
}) {
  const textAlignClassName =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left"
  const justifyClassName =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
        : "justify-start"

  return (
    <div
      className={[
        orientation === "horizontal"
          ? "grid w-fit min-w-64 grid-cols-2 gap-6"
          : "grid w-fit min-w-32 gap-3",
        textAlignClassName,
      ].join(" ")}
    >
      <DatePickerField
        justifyClassName={justifyClassName}
        label="Date"
        value={date}
        onChange={onDateChange}
      />
      <DatePickerField
        justifyClassName={justifyClassName}
        label="Due"
        value={dueDate}
        onChange={onDueDateChange}
      />
    </div>
  )
}

function DocumentTitleField({
  align = "left",
  value,
  onChange,
}: {
  align?: "left" | "center"
  value: string
  onChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) return

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      className={[
        "block w-full resize-none overflow-hidden bg-transparent [font-family:var(--document-heading-font-family)] text-4xl leading-tight font-bold tracking-tight wrap-break-word whitespace-pre-wrap text-[var(--document-foreground)] outline-none placeholder:text-[color-mix(in_oklab,var(--document-muted-foreground)_45%,transparent)]",
        align === "center" ? "text-center" : "text-left",
      ].join(" ")}
      placeholder="Document title..."
      aria-label="Document title"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function DatePickerField({
  justifyClassName,
  label,
  value,
  onChange,
}: {
  justifyClassName: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="block text-[10px] font-bold tracking-widest text-[var(--document-muted-foreground)] uppercase">
        {label}
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className={[
                "h-auto w-full gap-2 px-0 py-0 text-sm font-medium text-[var(--document-foreground)] hover:bg-transparent",
                justifyClassName,
              ].join(" ")}
              aria-label={`${label}: ${formatDate(value)}`}
            />
          }
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="h-4 w-4 text-[var(--document-muted-foreground)]"
          />
          <span>{formatDate(value)}</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={parseDate(value)}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                onChange(toDateValue(selectedDate))
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CustomFields({
  fields,
  onChange,
  onRemove,
}: {
  fields: Array<DocumentHeaderCustomField>
  onChange: (
    index: number,
    fieldKey: keyof DocumentHeaderCustomField,
    value: string
  ) => void
  onRemove: (index: number) => void
}) {
  return fields.map((field, index) => (
    <div
      key={field.id || `custom-field-${field.label}-${field.value}`}
      className="group grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)_auto] items-center gap-2"
    >
      <Field
        placeholder="Label"
        value={field.label}
        onChange={(value) => onChange(index, "label", value)}
        className="text-xs font-bold tracking-wider text-[var(--document-muted-foreground)]"
      />
      <Field
        placeholder="Value"
        value={field.value}
        onChange={(value) => onChange(index, "value", value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onRemove(index)}
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        aria-label="Remove custom field"
      >
        <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
      </Button>
    </div>
  ))
}

function Field({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const fieldClassName = [
    "min-h-6 w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0.5 text-sm text-[var(--document-foreground)] shadow-none transition-colors placeholder:text-[color-mix(in_oklab,var(--document-muted-foreground)_58%,transparent)] hover:border-[var(--document-border)] focus-visible:border-[var(--document-border)] focus-visible:outline-none focus-visible:ring-0 data-empty:text-[var(--document-muted-foreground)]",
    className,
  ].join(" ")

  return (
    <Editable
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      className="gap-0"
    >
      <EditableArea className="block w-full">
        <EditablePreview className={fieldClassName} />
        <EditableInput className={fieldClassName} />
      </EditableArea>
    </Editable>
  )
}
