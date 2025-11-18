import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { db } from "./index"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function runMigrations() {
  try {
    // Usar caminho absoluto para as migrações
    const migrationsFolder = path.join(process.cwd(), "drizzle")
    migrate(db, { migrationsFolder })
    console.log("✅ Migrations applied successfully")
  } catch (error) {
    console.error("❌ Error running migrations:", error)
    throw error
  }
}

// Executar migrações se este arquivo for executado diretamente
const isMainModule = process.argv[1]?.endsWith("migrate.ts") || 
  process.argv[1]?.includes("migrate.ts")

if (isMainModule) {
  runMigrations()
    .then(() => {
      console.log("Migrations completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration failed:", error)
      process.exit(1)
    })
}

