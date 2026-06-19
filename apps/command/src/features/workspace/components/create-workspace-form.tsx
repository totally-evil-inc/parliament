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
import { cn } from "@workspace/ui/lib/utils"
import { fieldError, zodFieldValidator } from "@/features/auth/lib/form"
import { slugify } from "@/features/auth/onboarding/onboarding-draft"
import { useSlugAvailability } from "@/features/workspace/hooks/use-slug-availability"
import { authClient } from "@/lib/auth-client"
import { organizationSchema } from "@/utils/auth-schemas"

type CreateWorkspaceValues = {
  organizationName: string
  organizationSlug: string
}

export type CreatedOrg = {
  id: string
  name: string
  slug: string
}

type Props = {
  defaultValues?: Partial<CreateWorkspaceValues>
  onSuccess: (org: CreatedOrg) => void
  onCancel?: () => void
  submitLabel?: string
  className?: string
}

export function CreateWorkspaceForm({
  defaultValues,
  onSuccess,
  onCancel,
  submitLabel = "Create workspace",
  className,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [slugValue, setSlugValue] = useState(
    defaultValues?.organizationSlug ?? ""
  )
  const slugLockedRef = useRef(!!defaultValues?.organizationSlug)

  const form = useForm({
    defaultValues: {
      organizationName: defaultValues?.organizationName ?? "",
      organizationSlug: defaultValues?.organizationSlug ?? "",
    },
    validators: {
      onChange: zodFieldValidator(organizationSchema),
      onSubmit: zodFieldValidator(organizationSchema),
    },
    onSubmit: async ({ value }) => {
      setServerError(null)

      const { data, error } = await authClient.organization.create({
        name: value.organizationName.trim(),
        slug: value.organizationSlug.trim(),
      })

      if (error) {
        setServerError(error.message ?? "Failed to create workspace.")
        return
      }

      onSuccess({ id: data.id, name: data.name, slug: data.slug })
    },
  })

  const { state: slugState } = useSlugAvailability(slugValue)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
      className={cn("flex flex-col gap-5", className)}
    >
      {serverError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <form.Field name="organizationName">
        {(field) => {
          const error = fieldError(field.state.meta.errors)

          return (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-workspace-name"
                className="block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase"
              >
                Workspace name
              </label>
              <Input
                id="create-workspace-name"
                placeholder="Acme Studios"
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
                htmlFor="create-workspace-slug"
                className="block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase"
              >
                Workspace URL
              </label>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <InputGroupText>app/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="create-workspace-slug"
                  placeholder="acme-studios"
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
          <div className="flex items-center justify-end gap-2 pt-1">
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !canSubmit ||
                !values.organizationName.trim() ||
                !values.organizationSlug.trim() ||
                slugState === "checking" ||
                slugState === "taken" ||
                slugState === "error"
              }
            >
              {isSubmitting ? "Creating..." : submitLabel}
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}
