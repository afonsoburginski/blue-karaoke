import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Para Supabase: usar DIRECT_URL para migrations (sem pooler)
// Para PostgreSQL local: usar DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL não está definida nas variáveis de ambiente")
}

export async function runMigrations() {
  try {
    const client = postgres(connectionString, { max: 1 })
    const db = drizzle(client)

    console.log("🔄 Aplicando migrations...")
    console.log(`📊 Usando: ${process.env.DIRECT_URL ? 'DIRECT_URL (Supabase)' : 'DATABASE_URL'}`)
    
    const migrationsFolder = path.join(process.cwd(), "drizzle")
    await migrate(db, { migrationsFolder })
    
    console.log("✅ Migrations aplicadas com sucesso!")
    
    await client.end()
  } catch (error) {
    console.error("❌ Erro ao aplicar migrations:", error)
    throw error
  }
}

// Executar migrações se este arquivo for executado diretamente
const isMainModule = process.argv[1]?.endsWith("migrate.ts") || 
  process.argv[1]?.includes("migrate.ts")

if (isMainModule) {
  runMigrations()
    .then(() => {
      console.log("Migrations concluídas")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration falhou:", error)
      process.exit(1)
    })
}

