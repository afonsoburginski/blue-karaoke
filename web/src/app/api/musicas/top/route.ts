import { NextRequest, NextResponse } from "next/server"
import { db, historico, musicas } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar todas as músicas mais tocadas (sem filtro de data por enquanto)
    // TODO: Implementar filtro por período quando houver dados suficientes
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

