import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { organizationSchema } from "@/utils/auth-schemas"
import { type OrganizationDraft, slugify } from "../onboarding-draft"

export function OrganizationStep({
  draft,
  pending,
  onSubmit,
}: {
  draft: OrganizationDraft | null
  pending: boolean
  onSubmit: (draft: OrganizationDraft) => void | Promise<void>
}) {
  const form = useForm({
    defaultValues: {
      organizationName: draft?.organizationName ?? "",
      organizationSlug: draft?.organizationSlug ?? "",
    },
    validators: {
      onChange: zodFieldValidator(organizationSchema),
      onSubmit: zodFieldValidator(organizationSchema),
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        organizationName: value.organizationName.trim(),
        organizationSlug: value.organizationSlug.trim(),
      })
    },
  })

  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Organization basics
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Name your organization
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The slug is required and can be edited before setup continues.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <form.Field name="organizationName">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-organization">
                  Organization name
                </Label>
                <Input
                  id="onboarding-organization"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    const slugField = form.getFieldValue("organizationSlug")

                    if (!slugField.trim()) {
                      form.setFieldValue(
                        "organizationSlug",
                        slugify(e.target.value)
                      )
                    }
                  }}
                  aria-invalid={!!error}
                  aria-describedby={
                    error ? "onboarding-organization-error" : undefined
                  }
                />
                {error ? (
                  <p
                    id="onboarding-organization-error"
                    className="text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>

        <form.Field name="organizationSlug">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-slug">Organization slug</Label>
                <Input
                  id="onboarding-slug"
                  placeholder="acme-inc"
                  autoComplete="off"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(slugify(e.target.value))}
                  aria-invalid={!!error}
                  aria-describedby={error ? "onboarding-slug-error" : undefined}
                />
                {error ? (
                  <p
                    id="onboarding-slug-error"
                    className="text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            values: state.values,
          })}
        >
          {({ canSubmit, values }) => (
            <Button
              type="submit"
              size="lg"
              disabled={
                pending ||
                !canSubmit ||
                !values.organizationName.trim() ||
                !values.organizationSlug.trim()
              }
              className="mt-2"
            >
              {pending ? "Creating..." : "Continue"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  )
}
