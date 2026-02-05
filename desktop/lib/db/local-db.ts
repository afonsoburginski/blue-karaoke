import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import path from "path"
import * as schema from "./local-schema"

// Obter diretório de dados do usuário
const getDataPath = () => {
  const env = process.env.NODE_ENV
  const userData = process.env.BLUE_KARAOKE_USER_DATA
  
  console.log(`[LOCAL-DB] NODE_ENV: ${env}, BLUE_KARAOKE_USER_DATA: ${userData}`)
  
  if (env === "development") {
    const devPath = path.join(process.cwd(), "db.sqlite")
    console.log(`[LOCAL-DB] Usando caminho de desenvolvimento: ${devPath}`)
    return devPath
  }
  
  // Em produção (release): Next.js roda em processo separado — usar env passado pelo Electron
  if (userData) {
    const prodPath = path.join(userData, "db.sqlite")
    console.log(`[LOCAL-DB] Usando BLUE_KARAOKE_USER_DATA: ${prodPath}`)
    return prodPath
  }
  
  // Fallback: tentar Electron no mesmo processo (não ocorre no release)
  try {
    const { app } = require("electron")
    const fallbackPath = path.join(app.getPath("userData"), "db.sqlite")
    console.log(`[LOCAL-DB] Usando Electron userData: ${fallbackPath}`)
    return fallbackPath
  } catch {
    const cwdPath = path.join(process.cwd(), "db.sqlite")
    console.log(`[LOCAL-DB] Usando cwd fallback: ${cwdPath}`)
    return cwdPath
  }
}

const dbPath = getDataPath()
console.log(`[LOCAL-DB] Caminho final do banco: ${dbPath}`)

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
