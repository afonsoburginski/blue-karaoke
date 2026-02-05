import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { localDb, musicasLocal } from "@/lib/db/local-db"
import { db } from "@/lib/db"
import { musicas } from "@/lib/db/schema"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"
import path from "path"
import fs from "fs"

export const runtime = "nodejs"

/**
 * Reindexar músicas que existem no disco mas não estão no banco local.
 * Busca os dados no Supabase e insere no SQLite local.
 * POST /api/sync/reindex
 */
export async function POST(request: NextRequest) {
  try {
    await ensureLocalDbInitialized()
    
    // Obter diretório de músicas
    const userData = process.env.BLUE_KARAOKE_USER_DATA
    let musicasDir: string
    if (userData) {
      musicasDir = path.join(userData, "musicas")
    } else if (process.env.NODE_ENV === "development") {
      musicasDir = path.join(process.cwd(), "musicas")
    } else {
      try {
        const { app } = require("electron")
        musicasDir = path.join(app.getPath("userData"), "musicas")
      } catch {
        musicasDir = path.join(process.cwd(), "musicas")
      }
    }
    
    console.log("[REINDEX] Diretório de músicas:", musicasDir)
    
    if (!fs.existsSync(musicasDir)) {
      return NextResponse.json({ 
        success: true, 
        message: "Pasta de músicas não existe", 
        reindexed: 0 
      })
    }
    
    // Listar arquivos de músicas
    const files = fs.readdirSync(musicasDir).filter(f => f.endsWith(".mp4"))
    console.log(`[REINDEX] ${files.length} arquivos .mp4 encontrados`)
    
    let reindexed = 0
    const errors: string[] = []
    
    for (const file of files) {
      const codigo = path.basename(file, ".mp4")
      const filePath = path.join(musicasDir, file)
      
      // Verificar se já está no banco local
      const existing = await localDb
        .select()
        .from(musicasLocal)
        .where(eq(musicasLocal.codigo, codigo))
        .limit(1)
      
      if (existing.length > 0) {
        continue // Já existe no banco
      }
      
      // Buscar dados no Supabase
      try {
        const remoteData = await db
          .select()
          .from(musicas)
          .where(eq(musicas.codigo, codigo))
          .limit(1)
        
        if (remoteData.length === 0) {
          console.log(`[REINDEX] ${codigo}: não encontrado no Supabase`)
          errors.push(`${codigo}: não encontrado no Supabase`)
          continue
        }
        
        const musica = remoteData[0]
        const stats = fs.statSync(filePath)
        
        // Inserir no banco local
        await localDb.insert(musicasLocal).values({
          id: String(musica.id),
          codigo: musica.codigo,
          artista: musica.artista,
          titulo: musica.titulo,
          arquivo: filePath,
          nomeArquivo: musica.nomeArquivo ?? null,
          tamanho: stats.size,
          duracao: musica.duracao ?? null,
          userId: musica.userId ? String(musica.userId) : null,
          syncedAt: Date.now(),
          createdAt: musica.createdAt.getTime(),
          updatedAt: Date.now(),
        })
        
        console.log(`[REINDEX] ${codigo}: inserido no banco local (${musica.titulo} - ${musica.artista})`)
        reindexed++
      } catch (err: any) {
        console.error(`[REINDEX] Erro ao reindexar ${codigo}:`, err.message)
        errors.push(`${codigo}: ${err.message}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Reindexação concluída`,
      total: files.length,
      reindexed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[REINDEX] Erro:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
