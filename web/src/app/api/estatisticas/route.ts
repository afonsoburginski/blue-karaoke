import { NextRequest, NextResponse } from "next/server"
import { db, estatisticas, users, musicas, historico, assinaturas, postgresClient } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, sql, count, and, gte, lte, or } from "drizzle-orm"

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

    // Buscar estatísticas em cache
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

    // Se não existir ou estiver desatualizado (mais de 1 hora), recalcular
    const shouldRecalculate =
      !cachedStats ||
      cachedStats.mesReferencia !== mesReferencia ||
      (cachedStats.updatedAt &&
        new Date(cachedStats.updatedAt).getTime() < now.getTime() - 60 * 60 * 1000)

    if (shouldRecalculate) {
      // Calcular estatísticas reais
      const totalUsuarios = await db
        .select({ count: count() })
        .from(users)

      const totalMusicas = await db
        .select({ count: count() })
        .from(musicas)

      const totalGbResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(${musicas.tamanho}), 0)`,
        })
        .from(musicas)

      const totalGb = Math.round((totalGbResult[0]?.total || 0) / (1024 * 1024 * 1024))

      // Calcular receita mensal real: somar valores de assinaturas criadas no mês atual
      // Usar SQL direto para comparação de datas mais confiável
      const receitaQuery = await postgresClient`
        SELECT COALESCE(SUM(valor), 0)::int as total
        FROM assinaturas
        WHERE 
          (status = 'ativa' OR status = 'pendente')
          AND data_inicio >= DATE_TRUNC('month', CURRENT_DATE)
          AND data_inicio < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      `
      
      const receitaMensal = Number(receitaQuery[0]?.total || 0)

      // Salvar ou atualizar cache
      if (cachedStats) {
        [cachedStats] = await db
          .update(estatisticas)
          .set({
            totalUsuarios: totalUsuarios[0]?.count || 0,
            totalMusicas: totalMusicas[0]?.count || 0,
            totalGb,
            receitaMensal,
            mesReferencia,
            updatedAt: new Date(),
          })
          .where(eq(estatisticas.id, cachedStats.id))
          .returning()
      } else {
        [cachedStats] = await db
          .insert(estatisticas)
          .values({
            userId: currentUser.userId,
            totalUsuarios: totalUsuarios[0]?.count || 0,
            totalMusicas: totalMusicas[0]?.count || 0,
            totalGb,
            receitaMensal,
            mesReferencia,
          })
          .returning()
      }
    }

    // Estatísticas do histórico do usuário
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
      .orderBy(sql`${historico.dataExecucao} DESC`)
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

