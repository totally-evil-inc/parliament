import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { checkOrgSlug } from "@/server/org"
import { organizationSchema } from "@/utils/auth-schemas"

export type SlugAvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "error"

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const formatOk = (s: string) =>
  organizationSchema.shape.organizationSlug.safeParse(s).success

export function useSlugAvailability(slug: string): {
  state: SlugAvailabilityState
} {
  const debouncedSlug = useDebounce(slug, 400)
  const isDebouncing = slug !== debouncedSlug && !!slug && formatOk(slug)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["slug-check", debouncedSlug],
    queryFn: () => checkOrgSlug({ data: { slug: debouncedSlug } }),
    enabled: !!debouncedSlug && formatOk(debouncedSlug),
    staleTime: 30_000,
    retry: false,
  })

  if (!slug || !formatOk(slug)) return { state: "idle" }
  if (isDebouncing || isLoading) return { state: "checking" }
  if (isError) return { state: "error" }
  if (data?.available === true) return { state: "available" }
  if (data?.available === false) return { state: "taken" }
  return { state: "idle" }
}
