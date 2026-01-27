/**
 * Utilitário para limpeza periódica de sessões expiradas
 * Pode ser executado via cron job ou manualmente
 */

import { db } from "./db"
import { session } from "./db/schema"
import { sql, and, lt, desc, eq, gt } from "drizzle-orm"

/**
 * Remove todas as sessões expiradas do banco de dados
 * @returns Número de sessões removidas
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date()
    
    // Deletar todas as sessões expiradas
    const result = await db
      .delete(session)
      .where(lt(session.expiresAt, now))
      .returning()
    
    const deletedCount = result.length
    console.log(`[session-cleanup] Removidas ${deletedCount} sessões expiradas`)
    
    return deletedCount
  } catch (error) {
    console.error("[session-cleanup] Erro ao limpar sessões expiradas:", error)
    throw error
  }
}

/**
 * Remove sessões antigas de um usuário específico (mantém apenas as N mais recentes)
 * @param userId ID do usuário
 * @param keepCount Número de sessões a manter (padrão: 5)
 * @returns Número de sessões removidas
 */
export async function cleanupUserOldSessions(
  userId: string,
  keepCount: number = 5
): Promise<number> {
  try {
    // Buscar todas as sessões ativas do usuário ordenadas por data de criação (mais recente primeiro)
    const activeSessions = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.userId, userId),
          gt(session.expiresAt, new Date())
        )
      )
      .orderBy(desc(session.createdAt))
    
    // Se tiver mais sessões do que o permitido, deletar as mais antigas
    if (activeSessions.length > keepCount) {
      const sessionsToDelete = activeSessions.slice(keepCount)
      const sessionIdsToDelete = sessionsToDelete.map(s => s.id)
      
      if (sessionIdsToDelete.length > 0) {
        await db
          .delete(session)
          .where(sql`${session.id} = ANY(${sessionIdsToDelete})`)
        
        console.log(`[session-cleanup] Removidas ${sessionIdsToDelete.length} sessões antigas do usuário ${userId}`)
        return sessionIdsToDelete.length
      }
    }
    
    return 0
  } catch (error) {
    console.error(`[session-cleanup] Erro ao limpar sessões do usuário ${userId}:`, error)
    throw error
  }
}

/**
 * Limpeza completa: remove sessões expiradas e limita sessões por usuário
 * @param maxSessionsPerUser Número máximo de sessões ativas por usuário (padrão: 5)
 * @returns Estatísticas da limpeza
 */
export async function performFullCleanup(
  maxSessionsPerUser: number = 5
): Promise<{
  expiredSessionsRemoved: number
  oldSessionsRemoved: number
  usersAffected: number
}> {
  try {
    // 1. Remover todas as sessões expiradas
    const expiredSessionsRemoved = await cleanupExpiredSessions()
    
    // 2. Para cada usuário, limitar número de sessões ativas
    // Buscar todos os usuários que têm sessões ativas
    const usersWithSessions = await db
      .selectDistinct({ userId: session.userId })
      .from(session)
      .where(gt(session.expiresAt, new Date()))
    
    let oldSessionsRemoved = 0
    let usersAffected = 0
    
    // Limpar sessões antigas para cada usuário
    for (const { userId } of usersWithSessions) {
      if (!userId) continue
      
      const removed = await cleanupUserOldSessions(userId, maxSessionsPerUser)
      if (removed > 0) {
        oldSessionsRemoved += removed
        usersAffected++
      }
    }
    
    console.log(`[session-cleanup] Limpeza completa: ${expiredSessionsRemoved} expiradas, ${oldSessionsRemoved} antigas de ${usersAffected} usuários`)
    
    return {
      expiredSessionsRemoved,
      oldSessionsRemoved,
      usersAffected,
    }
  } catch (error) {
    console.error("[session-cleanup] Erro na limpeza completa:", error)
    throw error
  }
}
