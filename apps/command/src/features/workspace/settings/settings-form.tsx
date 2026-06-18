import { ImageUpload01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { SettingsSection } from "./settings-section"

export type WorkspaceSettingsValues = {
  name: string
  slug: string
  timezone: string
  dateFormat: string
  publicSignup: boolean
  adminTwoFactor: boolean
  showProjectIds: boolean
}

type SettingsFormProps = {
  values: WorkspaceSettingsValues
  onChange: <TKey extends keyof WorkspaceSettingsValues>(
    key: TKey,
    value: WorkspaceSettingsValues[TKey]
  ) => void
}

const timezoneOptions = [
  { value: "utc-8", label: "Pacific (UTC-8)" },
  { value: "utc-5", label: "Eastern (UTC-5)" },
  { value: "utc", label: "UTC" },
  { value: "utc+1", label: "Central European (UTC+1)" },
  { value: "utc+3", label: "East Africa (UTC+3)" },
  { value: "utc+9", label: "Japan (UTC+9)" },
]

const dateFormatOptions = [
  { value: "ymd", label: "YYYY-MM-DD" },
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "mdy", label: "MM/DD/YYYY" },
]

export function SettingsForm({ values, onChange }: SettingsFormProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 md:px-8">
      <SettingsSection title="Identity" hint="Visible to anyone with access.">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 ring-1 ring-border/60" />
          <div className="min-w-0 flex-1">
            <Button size="sm" variant="outline" type="button">
              <HugeiconsIcon icon={ImageUpload01Icon} strokeWidth={2} />
              Upload avatar
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              PNG or SVG, 1024x1024 max.
            </p>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
          <Input
            id="workspace-name"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="workspace-slug">Slug</FieldLabel>
          <div className="flex h-7 items-center gap-1 rounded-md border border-input bg-input/20 px-2 font-mono text-xs/relaxed transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30">
            <span className="shrink-0 text-muted-foreground">command.so/</span>
            <input
              id="workspace-slug"
              value={values.slug}
              onChange={(event) => onChange("slug", event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
          <FieldDescription>Used in URLs.</FieldDescription>
        </Field>
      </SettingsSection>

      <SettingsSection
        title="Region"
        hint="Defaults applied to new members and exports."
      >
        <Field>
          <FieldLabel htmlFor="workspace-timezone">Timezone</FieldLabel>
          <NativeSelect
            id="workspace-timezone"
            className="w-full"
            value={values.timezone}
            onChange={(event) => onChange("timezone", event.target.value)}
          >
            {timezoneOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="workspace-date-format">Date format</FieldLabel>
          <NativeSelect
            id="workspace-date-format"
            className="w-full"
            value={values.dateFormat}
            onChange={(event) => onChange("dateFormat", event.target.value)}
          >
            {dateFormatOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </SettingsSection>

      <SettingsSection title="Defaults">
        <SettingsSwitch
          title="Public sign-up"
          description="Anyone with a workspace email can request access."
          checked={values.publicSignup}
          onCheckedChange={(checked) => onChange("publicSignup", checked)}
        />
        <SettingsSwitch
          title="Two-factor for admins"
          description="Require a second factor for owner and admin roles."
          checked={values.adminTwoFactor}
          onCheckedChange={(checked) => onChange("adminTwoFactor", checked)}
        />
        <SettingsSwitch
          title="Show project IDs"
          description="Display the short ID next to project names everywhere."
          checked={values.showProjectIds}
          onCheckedChange={(checked) => onChange("showProjectIds", checked)}
        />
      </SettingsSection>
    </div>
  )
}

type SettingsSwitchProps = {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingsSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: SettingsSwitchProps) {
  return (
    <Field
      orientation="horizontal"
      className="items-start justify-between gap-6 rounded-lg border border-border/60 bg-card px-4 py-3 text-card-foreground"
    >
      <FieldContent>
        <FieldTitle>{title}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  )
}
