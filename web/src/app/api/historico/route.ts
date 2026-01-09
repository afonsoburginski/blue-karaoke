import { NextRequest, NextResponse } from "next/server"
import { db, historico, musicas, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar usuário completo para verificar role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const filter = searchParams.get("filter") // today, week, month, all

    // Build where conditions
    // Se for admin, não filtrar por userId (ver todo o histórico)
    const whereConditions = user?.role === "admin" 
      ? [] 
      : [eq(historico.userId, currentUser.userId)]

    // Note: Date filtering is done client-side below since Drizzle doesn't have direct date comparison support
    // The where clause only filters by userId

    let query = db
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

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any
    }

    const history = await query.orderBy(desc(historico.dataExecucao)).limit(limit)

    // Filtrar por data no cliente (temporário)
    let filteredHistory = history
    if (filter && filter !== "all") {
      const now = new Date()
      let startDate: Date

      switch (filter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      filteredHistory = history.filter(
        (item) => new Date(item.dataExecucao) >= startDate
      )
    }

    // Buscar músicas mais tocadas (agregado)
    // Se for admin, buscar de todos os usuários, senão apenas do usuário atual
    let mostPlayedQuery = db
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

    if (user?.role !== "admin") {
      mostPlayedQuery = mostPlayedQuery.where(eq(historico.userId, currentUser.userId)) as any
    }

    const mostPlayed = await mostPlayedQuery
      .groupBy(historico.musicaId, historico.codigo, musicas.titulo, musicas.artista, musicas.duracao)
      .orderBy(desc(sql`count(*)`))
      .limit(10)

    const mostPlayedMapped = mostPlayed.map(item => ({
      musicaId: item.musicaId,
      codigo: item.codigo,
      vezesTocada: Number(item.vezesTocada),
      titulo: item.titulo || "Desconhecida",
      artista: item.artista || "Desconhecido",
      duracao: item.duracao,
    }))

    return NextResponse.json({ 
      historico: filteredHistory,
      maisTocadas: mostPlayedMapped
    })
  } catch (error) {
    console.error("Erro ao buscar histórico:", error)
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

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
      .values({
        userId: currentUser.userId,
        musicaId,
        codigo,
      })
      .returning()

    return NextResponse.json({ historico: newHistorico }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar histórico:", error)
    return NextResponse.json(
      { error: "Erro ao criar histórico" },
      { status: 500 }
    )
  }
}

