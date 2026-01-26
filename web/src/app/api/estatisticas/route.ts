import { NextRequest, NextResponse } from "next/server"
import { db, estatisticas, users, musicas, historico, assinaturas, postgresClient } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, sql, count, and, gte, lte, or, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar ou calcular estatísticas
    const now = new Date()
    const mesReferencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // Buscar estatísticas em cache usando índice composto (user_id, mes_referencia)
    // O índice idx_estatisticas_user_mes otimiza esta query
    let [cachedStats] = await db
      .select()
      .from(estatisticas)
      .where(
        and(
          eq(estatisticas.userId, currentUser.userId),
          eq(estatisticas.mesReferencia, mesReferencia)
        )
      )
      .limit(1)

    // Se não existir ou estiver desatualizado (mais de 5 minutos), recalcular
    // Reduzido de 1 hora para 5 minutos para balancear performance e atualização
    const shouldRecalculate =
      !cachedStats ||
      cachedStats.mesReferencia !== mesReferencia ||
      (cachedStats.updatedAt &&
        new Date(cachedStats.updatedAt).getTime() < now.getTime() - 5 * 60 * 1000)

    if (shouldRecalculate) {
      
      // Usar uma única query SQL otimizada para calcular todas as estatísticas
      // Isso é muito mais eficiente que múltiplas queries separadas
      const statsQuery = await postgresClient`
        WITH user_count AS (
          SELECT COUNT(*)::int as total FROM users
        ),
        music_count AS (
          SELECT COUNT(*)::int as total FROM musicas
        ),
        storage_total AS (
          SELECT COALESCE(SUM(tamanho), 0)::bigint as total FROM musicas
        ),
        revenue_total AS (
          SELECT COALESCE(SUM(a.valor), 0)::int as total
          FROM assinaturas a
          INNER JOIN users u ON u.id = a.user_id
          WHERE 
            (a.status = 'ativa' OR a.status = 'pendente')
            AND u.role != 'admin'
            AND a.data_inicio >= DATE_TRUNC('month', CURRENT_DATE)
            AND a.data_inicio < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        )
        SELECT 
          (SELECT total FROM user_count) as total_usuarios,
          (SELECT total FROM music_count) as total_musicas,
          (SELECT total FROM storage_total) as total_bytes,
          (SELECT total FROM revenue_total) as receita_mensal
      `
      
      const stats = statsQuery[0]
      const totalUsuarios = stats?.total_usuarios || 0
      const totalMusicas = stats?.total_musicas || 0
      const totalGb = Math.round(Number(stats?.total_bytes || 0) / (1024 * 1024 * 1024))
      const receitaMensal = Number(stats?.receita_mensal || 0)

      // Salvar ou atualizar cache
      if (cachedStats) {
        const updated = await db
          .update(estatisticas)
          .set({
            totalUsuarios,
            totalMusicas,
            totalGb,
            receitaMensal,
            mesReferencia,
            updatedAt: new Date(),
          })
          .where(eq(estatisticas.id, cachedStats.id))
          .returning()
        cachedStats = updated[0] || cachedStats
      } else {
        const inserted = await db
          .insert(estatisticas)
          .values({
            userId: currentUser.userId,
            totalUsuarios,
            totalMusicas,
            totalGb,
            receitaMensal,
            mesReferencia,
          })
          .returning()
        cachedStats = inserted[0]
      }
    }

    // Estatísticas do histórico do usuário
    // O índice idx_historico_user_data otimiza estas queries
    const userHistory = await db
      .select({
        totalSessoes: count(),
      })
      .from(historico)
      .where(eq(historico.userId, currentUser.userId))

    const ultimaSessao = await db
      .select()
      .from(historico)
      .where(eq(historico.userId, currentUser.userId))
      .orderBy(desc(historico.dataExecucao))
      .limit(1)

    return NextResponse.json({
      stats: {
        totalUsuarios: cachedStats?.totalUsuarios || 0,
        totalMusicas: cachedStats?.totalMusicas || 0,
        totalGb: cachedStats?.totalGb || 0,
        receitaMensal: cachedStats?.receitaMensal || 0,
      },
      userStats: {
        totalSessoes: userHistory[0]?.totalSessoes || 0,
        ultimaSessao: ultimaSessao[0]?.dataExecucao || null,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    )
  }
}

