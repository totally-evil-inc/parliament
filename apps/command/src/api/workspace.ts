import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import type { JsonValue } from "@/server/api-client"
import { apiRequest } from "@/server/api-client"

const getWorkspaceTest = createServerFn({ method: "GET" }).handler(async () => {
  return await apiRequest<JsonValue>("/api/v1/test")
})

export const testQuery = queryOptions({
  queryKey: ["workspace", "test"],
  queryFn: () => getWorkspaceTest(),
})
