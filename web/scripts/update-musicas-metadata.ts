import path from "path"
import * as dotenv from "dotenv"
import { eq } from "drizzle-orm"
import { db, musicas } from "../src/lib/db"
import { r2Client, R2_BUCKET, getR2Key, R2_PUBLIC_URL } from "../src/lib/r2"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import getVideoDuration from "get-video-duration"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

/**
 * Obtém a duração de um vídeo usando a biblioteca get-video-duration
 */
async function getVideoDurationFromUrl(url: string): Promise<number | null> {
  try {
    const duration = await getVideoDuration(url)
    // A biblioteca retorna um número (segundos)
    return typeof duration === "number" ? Math.floor(duration) : null
  } catch (error: any) {
    return null
  }
}

/**
 * Processa uma música individual
 */
async function processMusica(musica: typeof musicas.$inferSelect) {
  try {
    // Extrair a key do R2 do campo arquivo
    const r2Key = getR2Key(musica.arquivo)

    // Buscar metadados do objeto no R2 (tamanho) - em paralelo
    const headCommand = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
    })

    let size: number | null = null
    try {
      const headResponse = await r2Client.send(headCommand)
      size = headResponse.ContentLength || null
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return { skipped: true, reason: "Arquivo não encontrado no R2" }
      }
      throw error
    }

    // Obter duração do vídeo
    const publicUrl = musica.arquivo.startsWith("http")
      ? musica.arquivo
      : `${R2_PUBLIC_URL}/${r2Key}`
    
    const duration = await getVideoDurationFromUrl(publicUrl)

    // Verificar se precisa atualizar
    const needsUpdate =
      (size !== null && musica.tamanho !== size) ||
      (duration !== null && musica.duracao !== duration)

    if (!needsUpdate) {
      return { skipped: true, reason: "Já está atualizado" }
    }

    // Preparar dados para atualização
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (size !== null && musica.tamanho !== size) {
      updateData.tamanho = size
    }

    if (duration !== null && musica.duracao !== duration) {
      updateData.duracao = duration
    }

    // Atualizar no banco
    await db
      .update(musicas)
      .set(updateData)
      .where(eq(musicas.id, musica.id))

    return {
      updated: true,
      size: size !== null && musica.tamanho !== size,
      duration: duration !== null && musica.duracao !== duration,
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

async function main() {
  console.log("🚀 Atualizando tamanho e duração das músicas do R2...\n")

  // Buscar todas as músicas
  const allMusicas = await db.select().from(musicas)

  console.log(`📦 Encontradas ${allMusicas.length} músicas no banco de dados`)
  console.log(`⚡ Processando em paralelo (20 por vez)...\n`)

  let updated = 0
  let skipped = 0
  let errors = 0
  let sizeUpdated = 0
  let durationUpdated = 0

  // Processar em chunks de 20 em paralelo para ser mais rápido
  const chunkSize = 20
  for (let i = 0; i < allMusicas.length; i += chunkSize) {
    const chunk = allMusicas.slice(i, i + chunkSize)
    
    // Processar chunk em paralelo
    const results = await Promise.all(chunk.map((musica) => processMusica(musica)))

    // Processar resultados
    for (const result of results) {
      if (result.error) {
        errors++
      } else if (result.skipped) {
        skipped++
      } else if (result.updated) {
        updated++
        if (result.size) sizeUpdated++
        if (result.duration) durationUpdated++
      }
    }

    // Log de progresso
    const processed = Math.min(i + chunkSize, allMusicas.length)
    console.log(`   → Processadas ${processed}/${allMusicas.length} músicas (${updated} atualizadas, ${skipped} ignoradas, ${errors} erros)`)
  }

  console.log("\n✅ Atualização concluída!")
  console.log(`   → Total atualizadas: ${updated} músicas`)
  console.log(`   → Tamanhos atualizados: ${sizeUpdated}`)
  console.log(`   → Durações atualizadas: ${durationUpdated}`)
  console.log(`   → Ignoradas (já estavam corretas ou não encontradas): ${skipped} músicas`)
  if (errors > 0) {
    console.log(`   → Erros: ${errors} músicas`)
  }
}

main().catch((err) => {
  console.error("❌ Erro ao atualizar metadados:", err)
  process.exit(1)
})

