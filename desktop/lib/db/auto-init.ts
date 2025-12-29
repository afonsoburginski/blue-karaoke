import { initLocalDb } from "./init-local"

let initialized = false
let initPromise: Promise<void> | null = null

/**
 * Inicializa o banco de dados local automaticamente (idempotente)
 * Pode ser chamado múltiplas vezes sem problemas
 */
export async function ensureLocalDbInitialized(): Promise<void> {
  if (initialized) {
    return
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      await initLocalDb()
      initialized = true
    } catch (error: any) {
      // Se já existe, não é erro
      if (!error.message?.includes("already exists") && !error.message?.includes("duplicate")) {
        console.error("Erro ao inicializar banco local:", error)
      }
      initialized = true // Marcar como inicializado mesmo em caso de erro (pode já existir)
    }
  })()

  return initPromise
}

