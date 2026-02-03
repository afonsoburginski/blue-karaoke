import { eq } from "drizzle-orm"
import { localDb, musicasLocal, historicoLocal } from "./db/local-db"
import { v4 as uuidv4 } from "uuid"
import { syncAll } from "./sync"
import { ensureLocalDbInitialized } from "./db/auto-init"

export interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

/**
 * Busca música por código apenas no banco local (só músicas já baixadas).
 * Não usa Supabase para evitar tentar tocar música sem arquivo.
 */
export async function getMusicaByCodigo(codigo: string): Promise<Musica | null> {
  await ensureLocalDbInitialized()
  const localResult = await localDb
    .select()
    .from(musicasLocal)
    .where(eq(musicasLocal.codigo, codigo))
    .limit(1)

  if (localResult.length > 0) {
    const musica = localResult[0]
    return {
      codigo: musica.codigo,
      artista: musica.artista,
      titulo: musica.titulo,
      arquivo: musica.arquivo,
    }
  }
  return null
}

/**
 * Salva histórico de reprodução (primeiro no local, depois sincroniza)
 */
export async function salvarHistorico(codigo: string, musicaId?: string, userId?: string) {
  // Garantir que o banco local está inicializado
  await ensureLocalDbInitialized()
  const id = uuidv4()
  const now = Date.now()

  // Salvar no banco local primeiro (sempre funciona, mesmo offline)
  await localDb.insert(historicoLocal).values({
    id,
    userId: userId || null,
    musicaId: musicaId || null,
    codigo,
    dataExecucao: now,
    syncedAt: null, // Não sincronizado ainda
    createdAt: now,
  })

  // Tentar sincronizar imediatamente (não bloqueia se falhar)
  syncAll().catch((error) => {
    console.error("Erro ao sincronizar após salvar histórico:", error)
  })
}

/**
 * Busca todas as músicas do banco local (só as já baixadas)
 */
export async function getAllMusicas(): Promise<Musica[]> {
  await ensureLocalDbInitialized()
  const localResult = await localDb.select().from(musicasLocal)
  return localResult.map((musica) => ({
    codigo: musica.codigo,
    artista: musica.artista,
    titulo: musica.titulo,
    arquivo: musica.arquivo,
  }))
}
