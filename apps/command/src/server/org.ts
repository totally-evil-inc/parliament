import { createServerFn } from "@tanstack/react-start"
import { db, eq, schema } from "@workspace/database"
import { z } from "zod"

export const checkOrgSlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const rows = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, data.slug))
      .limit(1)

    return { available: rows.length === 0 }
  })
