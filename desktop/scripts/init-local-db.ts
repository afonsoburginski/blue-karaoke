import { initLocalDb } from "../lib/db/init-local"

async function main() {
  try {
    console.log("🔄 Inicializando banco de dados local...")
    await initLocalDb()
    console.log("✅ Banco de dados local inicializado com sucesso!")
  } catch (error) {
    console.error("❌ Erro ao inicializar banco de dados local:", error)
    process.exit(1)
  }
}

main()

