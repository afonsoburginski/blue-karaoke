import { NextRequest, NextResponse } from "next/server"
import { db, musicas } from "@/lib/db"
import { desc, asc } from "drizzle-orm"

// API pública para listar músicas do catálogo (sem autenticação)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderBy = searchParams.get("orderBy") || "codigo"
    const order = searchParams.get("order") || "asc"

    // Buscar todas as músicas (apenas campos públicos)
    const allMusicas = await db
      .select({
        id: musicas.id,
        codigo: musicas.codigo,
        artista: musicas.artista,
        titulo: musicas.titulo,
        duracao: musicas.duracao,
        createdAt: musicas.createdAt,
      })
      .from(musicas)
      .orderBy(
        orderBy === "artista" 
          ? (order === "desc" ? desc(musicas.artista) : asc(musicas.artista))
          : orderBy === "titulo"
          ? (order === "desc" ? desc(musicas.titulo) : asc(musicas.titulo))
          : (order === "desc" ? desc(musicas.codigo) : asc(musicas.codigo))
      )

    return NextResponse.json({ 
      musicas: allMusicas,
      total: allMusicas.length 
    })
  } catch (error) {
    console.error("Erro ao buscar catálogo:", error)
    return NextResponse.json(
      { error: "Erro ao buscar catálogo" },
      { status: 500 }
    )
  }
}
