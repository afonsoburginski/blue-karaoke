/**
 * Função para limpar sessões antigas após login
 * Esta função é chamada manualmente após o sign-in ser bem-sucedido
 */

import { db } from "./db"
import { session } from "./db/schema"
import { eq, and, gt, desc, sql } from "drizzle-orm"

/**
 * Limpa sessões antigas de um usuário após login
 * Mantém apenas as 5 sessões mais recentes
 */
export async function cleanupOldSessionsAfterLogin(userId: string, currentSessionId: string) {
  try {
    // Limitar a 5 sessões ativas por usuário
    const MAX_SESSIONS = 5
    
    // Buscar todas as sessões ativas do usuário (não expiradas)
    const now = new Date()
    const activeSessions = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.userId, userId),
          gt(session.expiresAt, now)
        )
      )
      .orderBy(desc(session.createdAt))
    
    // Se tiver mais de MAX_SESSIONS sessões ativas, deletar as mais antigas
    if (activeSessions.length >= MAX_SESSIONS) {
      const sessionsToDelete = activeSessions.slice(MAX_SESSIONS - 1) // Manter MAX_SESSIONS - 1 (a nova sessão será adicionada)
      
      // Deletar sessões antigas (exceto a sessão atual que acabou de ser criada)
      const sessionIdsToDelete = sessionsToDelete
        .filter(s => s.id !== currentSessionId)
        .map(s => s.id)
      
      if (sessionIdsToDelete.length > 0) {
        await db
          .delete(session)
          .where(
            sql`${session.id} = ANY(${sessionIdsToDelete})`
          )
        
        console.log(`[auth] Invalidadas ${sessionIdsToDelete.length} sessões antigas para usuário ${userId}`)
      }
    }
    
    // Limpar sessões expiradas do usuário (manutenção)
    await db
      .delete(session)
      .where(
        and(
          eq(session.userId, userId),
          sql`${session.expiresAt} < NOW()`
        )
      )
  } catch (error) {
    console.error("[auth] Erro ao limpar sessões antigas:", error)
    // Não falhar o login se houver erro na limpeza
  }
}
