import "dotenv/config"
import { drizzle } from "drizzle-orm/bun-sql"

import * as schema from "./schema"

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL!,
  },
  schema,
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
  or,
  sql,
} from "drizzle-orm"
export { db, schema }
