import { NextRequest, NextResponse } from "next/server"
import { db, musicas } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc } from "drizzle-orm"

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
    const userId = searchParams.get("userId")

    let query = db.select().from(musicas)

    // Se for admin, pode ver todas. Se não, só as suas
    if (currentUser.role !== "admin" || !userId) {
      query = query.where(eq(musicas.userId, currentUser.userId))
    } else if (userId) {
      query = query.where(eq(musicas.userId, userId))
    }

    const allMusicas = await query.orderBy(desc(musicas.createdAt))

    return NextResponse.json({ musicas: allMusicas })
  } catch (error) {
    console.error("Erro ao buscar músicas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar músicas" },
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
    const { codigo, artista, titulo, arquivo, nomeArquivo, tamanho, duracao } = body

    if (!codigo || !artista || !titulo || !arquivo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: codigo, artista, titulo, arquivo" },
        { status: 400 }
      )
    }

    // Verificar se código já existe
    const existing = await db
      .select()
      .from(musicas)
      .where(eq(musicas.codigo, codigo))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Código já existe" },
        { status: 400 }
      )
    }

    const [newMusica] = await db
      .insert(musicas)
      .values({
        codigo,
        artista,
        titulo,
        arquivo,
        nomeArquivo,
        tamanho,
        duracao,
        userId: currentUser.userId,
      })
      .returning()

    return NextResponse.json({ musica: newMusica }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar música:", error)
    return NextResponse.json(
      { error: "Erro ao criar música" },
      { status: 500 }
    )
  }
}

