import type { Config } from "drizzle-kit"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

// Para Supabase: usar DIRECT_URL para migrations (sem pooler)
// Para PostgreSQL local: usar DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL não está definida nas variáveis de ambiente")
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
} satisfies Config

