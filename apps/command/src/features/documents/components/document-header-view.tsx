import {
  Calendar03Icon,
  Delete02Icon,
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
import { useConfirm } from "@/components/confirm-dialog-provider"

type CustomField = {
  label: string
  value: string
}

type DateFieldKey = "date" | "due" | "validUntil"

function getCustomFields(value: unknown): Array<CustomField> {
  return Array.isArray(value)
    ? value.filter(
        (field): field is CustomField =>
          typeof field === "object" &&
          field !== null &&
          "label" in field &&
          "value" in field
      )
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

  return date
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    : "Select date"
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function DocumentHeaderView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const confirm = useConfirm()
  const {
    title,
    date,
    due,
    validUntil,
    fromName,
    fromEmail,
    fromAddress,
    fromPhone,
    fromWebsite,
    fromTaxId,
    fromCustomFields: rawFromCustomFields,
    billToName,
    billToEmail,
    billToAddress,
    billToPhone,
    billToWebsite,
    billToTaxId,
    billToCustomFields: rawBillToCustomFields,
  } = node.attrs

  const fromCustomFields = getCustomFields(rawFromCustomFields)
  const billToCustomFields = getCustomFields(rawBillToCustomFields)
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
      [key]: [...fields, { label: "New Field", value: "" }],
    })
  }

  const updateCustomField = (
    key: "fromCustomFields" | "billToCustomFields",
    index: number,
    fieldKey: keyof CustomField,
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
      className="document-header mb-12 space-y-12"
      contentEditable={false}
    >
      <div className="space-y-6">
        <div className="ml-auto grid w-fit min-w-64 grid-cols-2 gap-6 text-right">
          <DatePickerField
            label="Date"
            value={date}
            onChange={(value) => handleDateChange("date", value)}
          />
          <DatePickerField
            label="Due"
            value={dueDate}
            onChange={(value) => handleDateChange("due", value)}
          />
        </div>

        <DocumentTitleField
          value={title}
          onChange={(value) => handleChange("title", value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-16 border-t pt-8">
        <div className="space-y-6">
          <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            From
          </label>
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
          <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            Bill To
          </label>
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

function DocumentTitleField({
  value,
  onChange,
}: {
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
      className="block w-full resize-none overflow-hidden bg-transparent text-4xl leading-tight font-bold tracking-tight wrap-break-word whitespace-pre-wrap outline-none placeholder:text-muted-foreground/30"
      placeholder="Document title..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </label>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-end gap-2 px-0 py-0 text-sm font-medium hover:bg-transparent"
            />
          }
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="h-4 w-4 text-muted-foreground"
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
  fields: Array<CustomField>
  onChange: (index: number, fieldKey: keyof CustomField, value: string) => void
  onRemove: (index: number) => void
}) {
  return fields.map((field, index) => (
    <div
      key={index}
      className="group grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)_auto] items-center gap-2"
    >
      <Field
        placeholder="Label"
        value={field.label}
        onChange={(value) => onChange(index, "label", value)}
        className="text-xs font-bold tracking-wider text-muted-foreground"
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
    "min-h-6 w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 py-0.5 text-sm shadow-none transition-colors placeholder:text-muted-foreground/40 hover:border-border focus-visible:border-border focus-visible:outline-none focus-visible:ring-0 data-empty:text-muted-foreground/40",
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
