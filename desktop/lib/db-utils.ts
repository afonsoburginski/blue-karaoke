import { eq } from "drizzle-orm"
import { localDb, musicasLocal, historicoLocal } from "./local-db"
import { db, musicas, historico } from "./db"
import { v4 as uuidv4 } from "uuid"
import { syncAll } from "../sync"
import { ensureLocalDbInitialized } from "./auto-init"

export interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

/**
 * Busca música por código (primeiro no local, depois no remoto)
 */
export async function getMusicaByCodigo(codigo: string): Promise<Musica | null> {
  // Garantir que o banco local está inicializado
  await ensureLocalDbInitialized()
  // Tentar buscar no banco local primeiro
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

  // Se não encontrou localmente, tentar no Supabase
  try {
    const remoteResult = await db
      .select()
      .from(musicas)
      .where(eq(musicas.codigo, codigo))
      .limit(1)

    if (remoteResult.length > 0) {
      const musica = remoteResult[0]
      // Salvar localmente para cache
      await localDb.insert(musicasLocal).values({
        id: musica.id,
        codigo: musica.codigo,
        artista: musica.artista,
        titulo: musica.titulo,
        arquivo: musica.arquivo,
        nomeArquivo: musica.nomeArquivo || null,
        tamanho: musica.tamanho || null,
        duracao: musica.duracao || null,
        userId: musica.userId || null,
        syncedAt: Date.now(), // Já está no remoto
        createdAt: musica.createdAt.getTime(),
        updatedAt: musica.updatedAt.getTime(),
      }).onConflictDoNothing()

      return {
        codigo: musica.codigo,
        artista: musica.artista,
        titulo: musica.titulo,
        arquivo: musica.arquivo,
      }
    }
  } catch (error) {
    console.error("Erro ao buscar música no remoto:", error)
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
 * Busca todas as músicas (primeiro do local, depois do remoto)
 */
export async function getAllMusicas(): Promise<Musica[]> {
  // Garantir que o banco local está inicializado
  await ensureLocalDbInitialized()
  // Buscar do banco local primeiro
  const localResult = await localDb.select().from(musicasLocal)

  if (localResult.length > 0) {
    return localResult.map((musica) => ({
      codigo: musica.codigo,
      artista: musica.artista,
      titulo: musica.titulo,
      arquivo: musica.arquivo,
    }))
  }

  // Se não tem nada local, buscar do remoto
  try {
    const remoteResult = await db.select().from(musicas)

    // Salvar localmente para cache
    for (const musica of remoteResult) {
      await localDb.insert(musicasLocal).values({
        id: musica.id,
        codigo: musica.codigo,
        artista: musica.artista,
        titulo: musica.titulo,
        arquivo: musica.arquivo,
        nomeArquivo: musica.nomeArquivo || null,
        tamanho: musica.tamanho || null,
        duracao: musica.duracao || null,
        userId: musica.userId || null,
        syncedAt: Date.now(),
        createdAt: musica.createdAt.getTime(),
        updatedAt: musica.updatedAt.getTime(),
      }).onConflictDoNothing()
    }

    return remoteResult.map((musica) => ({
      codigo: musica.codigo,
      artista: musica.artista,
      titulo: musica.titulo,
      arquivo: musica.arquivo,
    }))
  } catch (error) {
    console.error("Erro ao buscar músicas do remoto:", error)
    return []
  }
}
