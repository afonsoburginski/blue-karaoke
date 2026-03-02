import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import * as dotenv from "dotenv"

// Suprimir mensagens do dotenv
process.env.DOTENV_CONFIG_QUIET = "true"
import path from "path"

// Carregar .env.local silenciosamente
dotenv.config({ path: path.join(process.cwd(), ".env.local"), debug: false })

// Para Supabase: usar DATABASE_URL (pooler) para queries normais
// Para PostgreSQL local: usar DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Criar conexão com o banco
// Supabase pooler suporta até 200 conexões simultâneas
const client = postgres(DATABASE_URL, {
  max: process.env.NODE_ENV === "development" ? 5 : 15,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // requerido pelo PgBouncer em transaction mode
})

// Criar instância do Drizzle
export const db = drizzle(client, { schema })

// Exportar cliente postgres para queries SQL diretas
export { client as postgresClient }

// Exportar schema para uso em queries
export * from "./schema"

