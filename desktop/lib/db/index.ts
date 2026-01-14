import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import * as dotenv from "dotenv"
import path from "path"

// Carregar .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Para Supabase: usar DATABASE_URL (pooler) para queries normais
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Criar conexão com o banco Supabase
// Pooler suporta até 200 conexões simultâneas
const client = postgres(DATABASE_URL, {
  max: 15,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Criar instância do Drizzle
export const db = drizzle(client, { schema })

// Exportar schema para uso em queries
export * from "./schema"
