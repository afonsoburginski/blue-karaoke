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
    await initPromise
    return
  }

  initPromise = (async () => {
    try {
      await initLocalDb()
      initialized = true
      console.log("✅ Banco de dados local inicializado com sucesso")
    } catch (error: any) {
      // Se já existe, não é erro
      if (!error.message?.includes("already exists") && !error.message?.includes("duplicate")) {
        console.error("❌ Erro ao inicializar banco local:", error)
        // Não marcar como inicializado se houver erro real
        initialized = false
        initPromise = null
        throw error
      }
      initialized = true // Marcar como inicializado se for apenas duplicação
    }
  })()

  return initPromise
}

