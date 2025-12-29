import { NextRequest, NextResponse } from "next/server"
import { db, historico, musicas } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, sql, count } from "drizzle-orm"

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
    const period = searchParams.get("period") || "week" // week, month, year

    // Calcular data de início baseado no período
    const now = new Date()
    let startDate: Date

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Buscar músicas mais tocadas
    const topMusicsQuery = await db
      .select({
        musicaId: historico.musicaId,
        codigo: historico.codigo,
        reproducoes: sql<number>`count(*)::int`.as("reproducoes"),
        titulo: musicas.titulo,
        artista: musicas.artista,
      })
      .from(historico)
      .leftJoin(musicas, eq(historico.musicaId, musicas.id))
      .where(sql`${historico.dataExecucao} >= ${startDate.toISOString()}`)
      .groupBy(historico.musicaId, historico.codigo, musicas.titulo, musicas.artista)
      .orderBy(desc(sql`count(*)`))
      .limit(10)

    const topMusics = topMusicsQuery.map((item, index) => ({
      rank: index + 1,
      codigo: item.codigo,
      titulo: item.titulo || "Desconhecida",
      artista: item.artista || "Desconhecido",
      reproducoes: Number(item.reproducoes),
    }))

    return NextResponse.json({
      topMusics,
    })
  } catch (error) {
    console.error("Erro ao buscar músicas mais tocadas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar músicas mais tocadas" },
      { status: 500 }
    )
  }
}

