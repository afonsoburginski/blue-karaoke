import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

async function main() {
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  console.log("🔄 Aplicando migrations...")
  
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  
  console.log("✅ Migrations aplicadas com sucesso!")
  
  await client.end()
}

main().catch((error) => {
  console.error("❌ Erro ao aplicar migrations:", error)
  process.exit(1)
})

