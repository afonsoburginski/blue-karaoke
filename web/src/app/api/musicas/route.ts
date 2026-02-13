import { NextRequest, NextResponse } from "next/server"
import { db, musicas, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc } from "drizzle-orm"

// Colunas da listagem (menor payload; índices em created_at / user_id)
const listColumns = {
  id: musicas.id,
  codigo: musicas.codigo,
  titulo: musicas.titulo,
  artista: musicas.artista,
  duracao: musicas.duracao,
  tamanho: musicas.tamanho,
  arquivo: musicas.arquivo,
  nomeArquivo: musicas.nomeArquivo,
  createdAt: musicas.createdAt,
  updatedAt: musicas.updatedAt,
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get("userId")
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "500", 10)), 5000)
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10))

    let allMusicas

    if (userIdParam) {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, currentUser.userId))
        .limit(1)
      if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
      }
      allMusicas = await db
        .select(listColumns)
        .from(musicas)
        .where(eq(musicas.userId, userIdParam))
        .orderBy(desc(musicas.createdAt))
        .limit(limit)
        .offset(offset)
    } else {
      allMusicas = await db
        .select(listColumns)
        .from(musicas)
        .orderBy(desc(musicas.createdAt))
        .limit(limit)
        .offset(offset)
    }

    return NextResponse.json(
      { musicas: allMusicas },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
        },
      }
    )
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

