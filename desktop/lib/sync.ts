import { eq, and, isNull, sql } from "drizzle-orm"
import { localDb, musicasLocal, historicoLocal } from "./db/local-db"
import { db, musicas, historico } from "./db"

/**
 * Verifica se há conexão com a internet/Supabase
 */
async function isOnline(): Promise<boolean> {
  try {
    // Tentar uma query simples no Supabase
    await db.select().from(musicas).limit(1)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Sincroniza histórico local não sincronizado com Supabase
 */
export async function syncHistorico() {
  if (!(await isOnline())) {
    console.log("Offline: pulando sincronização de histórico")
    return { synced: 0, errors: [] }
  }

  try {
    // Buscar histórico local não sincronizado
    const unsynced = await localDb
      .select()
      .from(historicoLocal)
      .where(isNull(historicoLocal.syncedAt))

    if (unsynced.length === 0) {
      return { synced: 0, errors: [] }
    }

    const errors: string[] = []
    let synced = 0

    for (const entry of unsynced) {
      try {
        // Inserir no Supabase
        const [syncedEntry] = await db
          .insert(historico)
          .values({
            id: entry.id,
            userId: entry.userId || undefined,
            musicaId: entry.musicaId || undefined,
            codigo: entry.codigo,
            dataExecucao: new Date(entry.dataExecucao),
          })
          .returning()

        // Marcar como sincronizado no local
        await localDb
          .update(historicoLocal)
          .set({ syncedAt: Date.now() })
          .where(eq(historicoLocal.id, entry.id))

        synced++
      } catch (error: any) {
        // Se já existe no Supabase (duplicado), marcar como sincronizado mesmo assim
        if (error?.code === "23505" || error?.message?.includes("duplicate")) {
          await localDb
            .update(historicoLocal)
            .set({ syncedAt: Date.now() })
            .where(eq(historicoLocal.id, entry.id))
          synced++
        } else {
          errors.push(`Erro ao sincronizar histórico ${entry.id}: ${error.message}`)
        }
      }
    }

    return { synced, errors }
  } catch (error: any) {
    console.error("Erro na sincronização de histórico:", error)
    return { synced: 0, errors: [error.message] }
  }
}

/**
 * Sincroniza músicas locais não sincronizadas com Supabase
 */
export async function syncMusicas() {
  if (!(await isOnline())) {
    console.log("Offline: pulando sincronização de músicas")
    return { synced: 0, errors: [] }
  }

  try {
    // Buscar músicas locais não sincronizadas
    const unsynced = await localDb
      .select()
      .from(musicasLocal)
      .where(isNull(musicasLocal.syncedAt))

    if (unsynced.length === 0) {
      return { synced: 0, errors: [] }
    }

    const errors: string[] = []
    let synced = 0

    for (const musica of unsynced) {
      try {
        // Inserir no Supabase
        await db.insert(musicas).values({
          id: musica.id,
          codigo: musica.codigo,
          artista: musica.artista,
          titulo: musica.titulo,
          arquivo: musica.arquivo,
          nomeArquivo: musica.nomeArquivo || undefined,
          tamanho: musica.tamanho || undefined,
          duracao: musica.duracao || undefined,
          userId: musica.userId || undefined,
        })

        // Marcar como sincronizado no local
        await localDb
          .update(musicasLocal)
          .set({ syncedAt: Date.now() })
          .where(eq(musicasLocal.id, musica.id))

        synced++
      } catch (error: any) {
        // Se já existe no Supabase (duplicado), marcar como sincronizado mesmo assim
        if (error?.code === "23505" || error?.message?.includes("duplicate")) {
          await localDb
            .update(musicasLocal)
            .set({ syncedAt: Date.now() })
            .where(eq(musicasLocal.id, musica.id))
          synced++
        } else {
          errors.push(`Erro ao sincronizar música ${musica.codigo}: ${error.message}`)
        }
      }
    }

    return { synced, errors }
  } catch (error: any) {
    console.error("Erro na sincronização de músicas:", error)
    return { synced: 0, errors: [error.message] }
  }
}

/**
 * Sincroniza todos os dados locais com Supabase
 */
export async function syncAll() {
  console.log("Iniciando sincronização completa...")
  
  const historicoResult = await syncHistorico()
  const musicasResult = await syncMusicas()

  const totalSynced = historicoResult.synced + musicasResult.synced
  const allErrors = [...historicoResult.errors, ...musicasResult.errors]

  console.log(`Sincronização concluída: ${totalSynced} itens sincronizados`)
  if (allErrors.length > 0) {
    console.error("Erros durante sincronização:", allErrors)
  }

  return {
    synced: totalSynced,
    historico: historicoResult.synced,
    musicas: musicasResult.synced,
    errors: allErrors,
  }
}

