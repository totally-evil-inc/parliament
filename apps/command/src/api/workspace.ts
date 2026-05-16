import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import type { JsonValue } from "@/server/api-client"
import { apiRequest } from "@/server/api-client"
import { requireAuth } from "@/server/auth"

const getWorkspaceTest = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return await apiRequest<JsonValue>("/api/v1/test", context.auth)
  })

export const testQuery = queryOptions({
  queryKey: ["workspace", "test"],
  queryFn: () => getWorkspaceTest(),
})
