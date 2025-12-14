import { NextRequest, NextResponse } from "next/server"
import { db, historico, musicas } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const filter = searchParams.get("filter") // today, week, month, all

    // Build where conditions
    const whereConditions = [eq(historico.userId, currentUser.userId)]

    // Note: Date filtering is done client-side below since Drizzle doesn't have direct date comparison support
    // The where clause only filters by userId

    const query = db
      .select({
        id: historico.id,
        userId: historico.userId,
        musicaId: historico.musicaId,
        codigo: historico.codigo,
        nota: historico.nota,
        dataExecucao: historico.dataExecucao,
        musica: {
          titulo: musicas.titulo,
          artista: musicas.artista,
        },
      })
      .from(historico)
      .leftJoin(musicas, eq(historico.musicaId, musicas.id))
      .where(and(...whereConditions))

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

    return NextResponse.json({ historico: filteredHistory })
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
    const { musicaId, codigo, nota } = body

    if (!musicaId || !codigo || nota === undefined) {
      return NextResponse.json(
        { error: "Campos obrigatórios: musicaId, codigo, nota" },
        { status: 400 }
      )
    }

    const [newHistorico] = await db
      .insert(historico)
      .values({
        userId: currentUser.userId,
        musicaId,
        codigo,
        nota: Math.max(0, Math.min(100, nota)), // Garantir entre 0-100
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

