import type { z } from "zod"

export function zodFieldValidator<TValue>(schema: z.ZodType<TValue>) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)

    if (result.success) return undefined

    const fields: Record<string, string> = {}

    for (const issue of result.error.issues) {
      const fieldName = issue.path[0]

      if (typeof fieldName === "string") {
        fields[fieldName] = issue.message
      }
    }

    return Object.keys(fields).length > 0 ? { fields } : undefined
  }
}

export function fieldError(errors: Array<unknown>) {
  const firstError = errors[0]

  if (!firstError) return undefined

  return typeof firstError === "string" ? firstError : String(firstError)
}
