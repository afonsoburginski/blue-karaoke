import * as dotenv from "dotenv"
import path from "path"
import { db, musicas } from "@/lib/db"
import { getR2PublicUrl } from "@/lib/r2"
import { eq } from "drizzle-orm"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  console.log("🚀 Atualizando URLs das músicas para apontar para o R2...\n")

  // Buscar todas as músicas
  const allMusicas = await db.select().from(musicas)

  console.log(`📦 Encontradas ${allMusicas.length} músicas no banco de dados\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const musica of allMusicas) {
    try {
      // Gerar URL do R2 baseada no nome do arquivo
      const r2Url = getR2PublicUrl(musica.arquivo)

      // Se a URL já está correta, pular
      if (musica.arquivo === r2Url || musica.arquivo.startsWith("https://")) {
        skipped++
        continue
      }

      // Atualizar o campo arquivo com a URL do R2
      await db
        .update(musicas)
        .set({
          arquivo: r2Url,
          updatedAt: new Date(),
        })
        .where(eq(musicas.id, musica.id))

      updated++

      // Log a cada 100 atualizações
      if (updated % 100 === 0) {
        console.log(`   → ${updated} músicas atualizadas...`)
      }
    } catch (error: any) {
      errors++
      console.error(`   ❌ Erro ao atualizar ${musica.codigo}: ${error.message}`)
    }
  }

  console.log("\n✅ Atualização concluída!")
  console.log(`   → Atualizadas: ${updated} músicas`)
  console.log(`   → Ignoradas (já estavam corretas): ${skipped} músicas`)
  if (errors > 0) {
    console.log(`   → Erros: ${errors} músicas`)
  }
}

main().catch((err) => {
  console.error("❌ Erro ao atualizar URLs:", err)
  process.exit(1)
})

