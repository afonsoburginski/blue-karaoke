import { db } from "../lib/db"
import { musicas, historico } from "../lib/db/schema"

// Script para deletar todas as músicas ou todo o histórico
// Uso: tsx scripts/delete-all.ts <musicas|historico>
// Exemplo: tsx scripts/delete-all.ts musicas

const table = process.argv[2]

if (!table || (table !== "musicas" && table !== "historico")) {
  console.error("❌ Erro: Tabela inválida")
  console.log("Uso: tsx scripts/delete-all.ts <musicas|historico>")
  console.log("Exemplo: tsx scripts/delete-all.ts musicas")
  process.exit(1)
}

async function deleteAll() {
  try {
    if (table === "musicas") {
      console.log("🗑️  Deletando todo o histórico primeiro...")
      try {
        const histResult = await db.delete(historico)
        console.log(`   ✓ Histórico deletado: ${histResult.changes || 0} registros`)
      } catch (error) {
        console.log("   ⚠ Erro ao deletar histórico:", error)
      }

      console.log("🗑️  Deletando todas as músicas...")
      const result = await db.delete(musicas)
      console.log(`✅ Todas as músicas deletadas!`)
      console.log(`   Total: ${result.changes || 0} registros`)
    } else {
      console.log("🗑️  Deletando todo o histórico...")
      const result = await db.delete(historico)
      console.log(`✅ Todo o histórico deletado!`)
      console.log(`   Total: ${result.changes || 0} registros`)
    }

    process.exit(0)
  } catch (error) {
    console.error("❌ Erro ao deletar:", error)
    process.exit(1)
  }
}

deleteAll()

