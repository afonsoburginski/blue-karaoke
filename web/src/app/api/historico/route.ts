import { NextRequest, NextResponse } from "next/server"
import { db, historico, musicas } from "@/lib/db"
import { requireAuth, CACHE } from "@/lib/api"
import { eq, desc, and, gte, sql } from "drizzle-orm"

function getFilterStartDate(filter: string | null): Date | null {
  if (!filter || filter === "all") return null
  const now = new Date()
  switch (filter) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500)
    const filter = searchParams.get("filter")
    const startDate = getFilterStartDate(filter)

    // Montar condições WHERE: admins veem tudo, usuários apenas o próprio histórico
    const baseConditions = user.role === "admin"
      ? []
      : [eq(historico.userId, user.userId)]

    // Filtro de data no banco — evita buscar registros desnecessários
    if (startDate) baseConditions.push(gte(historico.dataExecucao, startDate))

    const whereClause = baseConditions.length > 0 ? and(...baseConditions) : undefined

    // Executa histórico e mais tocadas em paralelo (2 queries → mesmo round-trip)
    const mostPlayedConditions = user.role === "admin"
      ? []
      : [eq(historico.userId, user.userId)]
    const mostPlayedWhere = mostPlayedConditions.length > 0
      ? and(...mostPlayedConditions)
      : undefined

    const [history, mostPlayed] = await Promise.all([
      db
        .select({
          id: historico.id,
          userId: historico.userId,
          musicaId: historico.musicaId,
          codigo: historico.codigo,
          dataExecucao: historico.dataExecucao,
          musica: {
            id: musicas.id,
            titulo: musicas.titulo,
            artista: musicas.artista,
            duracao: musicas.duracao,
          },
        })
        .from(historico)
        .leftJoin(musicas, eq(historico.musicaId, musicas.id))
        .where(whereClause)
        .orderBy(desc(historico.dataExecucao))
        .limit(limit),

      db
        .select({
          musicaId: historico.musicaId,
          codigo: historico.codigo,
          vezesTocada: sql<number>`count(*)::int`.as("vezes_tocada"),
          titulo: musicas.titulo,
          artista: musicas.artista,
          duracao: musicas.duracao,
        })
        .from(historico)
        .leftJoin(musicas, eq(historico.musicaId, musicas.id))
        .where(mostPlayedWhere)
        .groupBy(historico.musicaId, historico.codigo, musicas.titulo, musicas.artista, musicas.duracao)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ])

    const historyNormalized = history.map((h) => ({
      ...h,
      dataExecucao:
        h.dataExecucao instanceof Date
          ? h.dataExecucao.toISOString()
          : typeof h.dataExecucao === "string"
            ? h.dataExecucao
            : new Date(h.dataExecucao as number).toISOString(),
      musica: h.musica
        ? {
            id: h.musica.id,
            titulo: h.musica.titulo ?? "Desconhecida",
            artista: h.musica.artista ?? "Desconhecido",
            duracao: h.musica.duracao ?? null,
          }
        : null,
    }))

    const maisTocadas = mostPlayed.map((item) => ({
      musicaId: item.musicaId,
      codigo: item.codigo,
      vezesTocada: Number(item.vezesTocada),
      titulo: item.titulo || "Desconhecida",
      artista: item.artista || "Desconhecido",
      duracao: item.duracao,
    }))

    return NextResponse.json(
      { historico: historyNormalized, maisTocadas },
      { headers: CACHE.SHORT }
    )
  } catch (error) {
    console.error("Erro ao buscar histórico:", error)
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const body = await request.json()
    const { musicaId, codigo } = body

    if (!musicaId || !codigo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: musicaId, codigo" },
        { status: 400 }
      )
    }

    const [newHistorico] = await db
      .insert(historico)
      .values({ userId: user.userId, musicaId, codigo })
      .returning()

    return NextResponse.json({ historico: newHistorico }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar histórico:", error)
    return NextResponse.json({ error: "Erro ao criar histórico" }, { status: 500 })
  }
}
