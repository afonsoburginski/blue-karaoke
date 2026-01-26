import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local"), debug: false })

// Para Supabase: usar DIRECT_URL para migrations (sem pooler)
// Para PostgreSQL local: usar DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL não está definida nas variáveis de ambiente")
}

async function main() {
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  console.log("🔄 Aplicando migrations...")
  console.log(`📊 Usando: ${process.env.DIRECT_URL ? 'DIRECT_URL (Supabase)' : 'DATABASE_URL'}`)
  
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  
  console.log("✅ Migrations aplicadas com sucesso!")
  
  await client.end()
}

main().catch((error) => {
  console.error("❌ Erro ao aplicar migrations:", error)
  process.exit(1)
})

