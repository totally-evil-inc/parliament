import "dotenv/config"
import { logger as pinoLogger } from "@workspace/logger"
import type { Logger as DrizzleLogger } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sql"

import * as schema from "./schema"

class DrizzlePinoLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    pinoLogger.debug({ query, params }, "Database query")
  }
}

const db = drizzle({
  connection: {
    url:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/parliament",
  },
  schema,
  logger: new DrizzlePinoLogger(),
})

export {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm"
export * from "./schema"
export { db, schema }
