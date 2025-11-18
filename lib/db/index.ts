import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import * as schema from "./schema"
import path from "path"
import fs from "fs"

// Função para obter o diretório do app (funciona no Electron e Node.js normal)
function getAppDataPath() {
  // No Electron, usar app.getPath('userData')
  // No Node.js normal, usar process.cwd()
  if (typeof window !== "undefined" && (window as any).electron) {
    // Renderer process - não deve ser usado aqui
    return process.cwd()
  }
  
  // Verificar se estamos no Electron main process
  try {
    const { app } = require("electron")
    if (app && !app.isPackaged) {
      // Desenvolvimento
      return process.cwd()
    } else if (app) {
      // Produção - usar userData do Electron
      return app.getPath("userData")
    }
  } catch (e) {
    // Não está no Electron, usar process.cwd()
  }
  
  return process.cwd()
}

// Garantir que o diretório existe
const appDataPath = getAppDataPath()
const dbPath = path.join(appDataPath, "db.sqlite")
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

