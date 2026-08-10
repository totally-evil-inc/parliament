import { logger as pinoLogger } from "@workspace/logger"
import type { Logger as DrizzleLogger } from "drizzle-orm"
import { drizzle } from "drizzle-orm/bun-sql"

import * as schema from "./schema"

class DrizzlePinoLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    pinoLogger.debug({ query, params }, "Database query")
  }
}

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>

let _db: DrizzleDatabase | null = null

function getDb(): DrizzleDatabase {
  if (!_db) {
    _db = drizzle({
      connection: {
        url:
          process.env.DATABASE_URL ||
          "postgres://postgres:postgres@localhost:5432/parliament",
        max: 10,
        idle_timeout: 5,
        connect_timeout: 10,
      },
      schema,
      logger: new DrizzlePinoLogger(),
    })
  }
  return _db
}

export const db = new Proxy({} as DrizzleDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance, prop, receiver)
    if (typeof value === "function") {
      return value.bind(instance)
    }
    return value
  },
  set(_target, prop, value) {
    const instance = getDb()
    Reflect.set(instance, prop, value)
    return true
  },
})

export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"
export * from "./schema"
export { schema }
