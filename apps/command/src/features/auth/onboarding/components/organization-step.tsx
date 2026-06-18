import { useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group"
import { Spinner } from "@workspace/ui/components/spinner"
import { slugify } from "../onboarding-draft"
import type { OrganizationDraft } from "../onboarding-draft"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { useSlugAvailability } from "@/features/workspace/hooks/use-slug-availability"
import { organizationSchema } from "@/utils/auth-schemas"

export function OrganizationStep({
  draft,
  pending,
  onSubmit,
}: {
  draft: OrganizationDraft | null
  pending: boolean
  onSubmit: (draft: OrganizationDraft) => void | Promise<void>
}) {
  const [slugValue, setSlugValue] = useState(draft?.organizationSlug ?? "")
  const slugLockedRef = useRef(!!draft?.organizationSlug)

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

  const { state: slugState } = useSlugAvailability(slugValue)

  return (
    <>
      <div className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        Organization basics
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight">
        Name your organization
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The URL slug is required and can be changed later in settings.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="mt-8 flex flex-col gap-5"
      >
        <form.Field name="organizationName">
          {(field) => {
            const error = fieldError(field.state.meta.errors)

            return (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="onboarding-organization"
                  className="block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase"
                >
                  Workspace name
                </label>
                <Input
                  id="onboarding-organization"
                  placeholder="Acme Inc."
                  autoComplete="organization"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)

                    if (!slugLockedRef.current) {
                      const slug = slugify(e.target.value)
                      form.setFieldValue("organizationSlug", slug)
                      setSlugValue(slug)
                    }
                  }}
                  aria-invalid={!!error}
                />
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
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
                <label
                  htmlFor="onboarding-slug"
                  className="block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase"
                >
                  Workspace URL
                </label>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>app/</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="onboarding-slug"
                    placeholder="acme-inc"
                    autoComplete="off"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      slugLockedRef.current = true
                      const slug = slugify(e.target.value)
                      field.handleChange(slug)
                      setSlugValue(slug)
                    }}
                    aria-invalid={!!error || slugState === "taken"}
                  />
                  <InputGroupAddon align="inline-end">
                    {slugState === "checking" ? (
                      <Spinner className="size-3 text-muted-foreground" />
                    ) : slugState === "available" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                        <span className="size-1 rounded-full bg-emerald-500" />
                        available
                      </span>
                    ) : null}
                  </InputGroupAddon>
                </InputGroup>
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : slugState === "taken" ? (
                  <p className="text-xs text-destructive">
                    This slug is already taken.
                  </p>
                ) : slugState === "error" ? (
                  <p className="text-xs text-destructive">
                    Could not verify availability. Please try again.
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
            values: state.values,
          })}
        >
          {({ canSubmit, isSubmitting, values }) => (
            <Button
              type="submit"
              size="lg"
              disabled={
                pending ||
                isSubmitting ||
                !canSubmit ||
                !values.organizationName.trim() ||
                !values.organizationSlug.trim() ||
                slugState === "checking" ||
                slugState === "taken" ||
                slugState === "error"
              }
              className="mt-2"
            >
              {pending || isSubmitting ? "Working..." : "Continue"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  )
}
