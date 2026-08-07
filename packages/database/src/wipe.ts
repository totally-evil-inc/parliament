import "dotenv/config"
import { sql } from "drizzle-orm"
import { db } from "./index"

async function wipeDatabase() {
  // Fetch all user table names in the public schema
  const result = await db.execute<{ table_name: string }>(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '__drizzle%';
  `)

  const tables = result.map((row) => row.table_name)

  if (tables.length === 0) {
    console.log("No tables found to wipe.")
    process.exit(0)
  }

  const tableIdentifiers = tables.map((t) => sql.identifier(t))
  await db.execute(
    sql`TRUNCATE TABLE ${sql.join(tableIdentifiers, sql`, `)} RESTART IDENTITY CASCADE;`
  )

  console.log(`Successfully wiped ${tables.length} tables.`)
  process.exit(0)
}

wipeDatabase().catch((_err) => {
  process.exit(1)
})
