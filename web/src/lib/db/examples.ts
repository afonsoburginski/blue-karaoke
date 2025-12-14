/**
 * Exemplos de uso do banco de dados
 * 
 * Este arquivo contém exemplos de como usar o Drizzle ORM
 * para realizar operações CRUD no banco de dados.
 */

import { db } from "./index"
import { users, musicas, historico, estatisticas } from "./schema"
import { eq, desc, count, sql, and } from "drizzle-orm"

// ============================================
// EXEMPLOS DE USUÁRIOS
// ============================================

/**
 * Criar um novo usuário
 */
export async function createUser(data: {
  slug: string
  name: string
  email: string
  password: string
  role?: "user" | "admin"
}) {
  const [user] = await db
    .insert(users)
    .values({
      slug: data.slug,
      name: data.name,
      email: data.email,
      password: data.password, // Deve ser um hash
      role: data.role || "user",
    })
    .returning()

  return user
}

/**
 * Buscar usuário por email
 */
export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  return user
}

/**
 * Buscar usuário por slug
 */
export async function getUserBySlug(slug: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1)

  return user
}

/**
 * Atualizar usuário
 */
export async function updateUser(userId: string, data: {
  name?: string
  email?: string
  avatar?: string
  password?: string
}) {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  return user
}

// ============================================
// EXEMPLOS DE MÚSICAS
// ============================================

/**
 * Criar uma nova música
 */
export async function createMusica(data: {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
  nomeArquivo?: string
  tamanho?: number
  duracao?: number
  userId: string
}) {
  const [musica] = await db
    .insert(musicas)
    .values(data)
    .returning()

  return musica
}

/**
 * Buscar todas as músicas de um usuário
 */
export async function getMusicasByUser(userId: string) {
  return await db
    .select()
    .from(musicas)
    .where(eq(musicas.userId, userId))
    .orderBy(desc(musicas.createdAt))
}

/**
 * Buscar música por código
 */
export async function getMusicaByCodigo(codigo: string) {
  const [musica] = await db
    .select()
    .from(musicas)
    .where(eq(musicas.codigo, codigo))
    .limit(1)

  return musica
}

/**
 * Deletar música
 */
export async function deleteMusica(musicaId: string) {
  await db
    .delete(musicas)
    .where(eq(musicas.id, musicaId))
}

// ============================================
// EXEMPLOS DE HISTÓRICO
// ============================================

/**
 * Criar registro de histórico
 */
export async function createHistorico(data: {
  userId: string
  musicaId: string
  codigo: string
  nota: number
}) {
  const [record] = await db
    .insert(historico)
    .values(data)
    .returning()

  return record
}

/**
 * Buscar histórico de um usuário
 */
export async function getHistoricoByUser(userId: string, limit = 50) {
  return await db
    .select()
    .from(historico)
    .where(eq(historico.userId, userId))
    .orderBy(desc(historico.dataExecucao))
    .limit(limit)
}

/**
 * Buscar estatísticas de um usuário
 */
export async function getUserStats(userId: string) {
  // Total de sessões
  const totalSessoes = await db
    .select({ count: count() })
    .from(historico)
    .where(eq(historico.userId, userId))

  // Média de pontuação
  const mediaPontuacao = await db
    .select({ avg: sql<number>`AVG(${historico.nota})` })
    .from(historico)
    .where(eq(historico.userId, userId))

  return {
    totalSessoes: totalSessoes[0]?.count || 0,
    mediaPontuacao: mediaPontuacao[0]?.avg || 0,
  }
}

// ============================================
// EXEMPLOS DE ESTATÍSTICAS
// ============================================

/**
 * Atualizar estatísticas
 */
export async function updateEstatisticas(userId: string, data: {
  totalUsuarios?: number
  totalMusicas?: number
  totalGb?: number
  receitaMensal?: number
  mesReferencia: string
}) {
  const [stats] = await db
    .insert(estatisticas)
    .values({
      userId,
      ...data,
    })
    .onConflictDoUpdate({
      target: [estatisticas.userId, estatisticas.mesReferencia],
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning()

  return stats
}

/**
 * Buscar estatísticas do mês
 */
export async function getEstatisticasMes(userId: string, mesReferencia: string) {
  const [stats] = await db
    .select()
    .from(estatisticas)
    .where(
      and(
        eq(estatisticas.userId, userId),
        eq(estatisticas.mesReferencia, mesReferencia)
      )
    )
    .limit(1)

  return stats
}

