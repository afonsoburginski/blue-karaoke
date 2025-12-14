import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import * as dotenv from "dotenv"
import path from "path"

// Carregar .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Criar conexão com o banco
const client = postgres(DATABASE_URL, {
  max: process.env.NODE_ENV === "development" ? 1 : 10,
})

// Criar instância do Drizzle
export const db = drizzle(client, { schema })

// Exportar schema para uso em queries
export * from "./schema"

