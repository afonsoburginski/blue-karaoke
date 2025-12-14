import { db } from "../lib/db"
import { musicas, historico } from "../lib/db/schema"
import { eq } from "drizzle-orm"

// Script para deletar uma música específica
// Uso: tsx scripts/delete-musica.ts <codigo>
// Exemplo: tsx scripts/delete-musica.ts 01001

const codigo = process.argv[2]

if (!codigo) {
  console.error("❌ Erro: Código da música é obrigatório")
  console.log("Uso: tsx scripts/delete-musica.ts <codigo>")
  console.log("Exemplo: tsx scripts/delete-musica.ts 01001")
  process.exit(1)
}

async function deleteMusica() {
  try {
    console.log(`🗑️  Deletando música ${codigo}...`)

    // Deletar histórico relacionado primeiro
    try {
      const histResult = await db.delete(historico).where(eq(historico.codigo, codigo))
      console.log(`   ✓ Histórico deletado: ${histResult.changes || 0} registros`)
    } catch (error) {
      console.log("   ⚠ Nenhum histórico encontrado ou erro ao deletar histórico")
    }

    // Deletar a música
    const result = await db.delete(musicas).where(eq(musicas.codigo, codigo))

    if (result.changes === 0) {
      console.log(`❌ Música com código ${codigo} não encontrada`)
      process.exit(1)
    }

    console.log(`✅ Música ${codigo} deletada com sucesso!`)
    console.log(`   Total de registros deletados: ${result.changes}`)
    process.exit(0)
  } catch (error) {
    console.error("❌ Erro ao deletar música:", error)
    process.exit(1)
  }
}

deleteMusica()

