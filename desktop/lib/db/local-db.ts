import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import path from "path"
import * as schema from "./local-schema"

// Obter diretório de dados do usuário
const getDataPath = () => {
  if (process.env.NODE_ENV === "development") {
    return path.join(process.cwd(), "db.sqlite")
  }
  // Em produção (release): Next.js roda em processo separado — usar env passado pelo Electron
  const userData = process.env.BLUE_KARAOKE_USER_DATA
  if (userData) {
    return path.join(userData, "db.sqlite")
  }
  // Fallback: tentar Electron no mesmo processo (não ocorre no release)
  try {
    const { app } = require("electron")
    return path.join(app.getPath("userData"), "db.sqlite")
  } catch {
    return path.join(process.cwd(), "db.sqlite")
  }
}

const dbPath = getDataPath()

// Criar conexão SQLite
const sqlite = new Database(dbPath)

// Habilitar foreign keys
sqlite.pragma("foreign_keys = ON")

// Criar instância do Drizzle
export const localDb = drizzle(sqlite, { schema })

// Exportar o caminho do banco e a instância SQLite para uso externo
export { dbPath, sqlite }

// Re-exportar schemas para facilitar importações
export { musicasLocal, historicoLocal, ativacaoLocal } from "./local-schema"
