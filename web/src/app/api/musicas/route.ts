import { NextRequest, NextResponse } from "next/server"
import { db, musicas } from "@/lib/db"
import { requireAuth, CACHE } from "@/lib/api"
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
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get("userId")
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "500", 10)), 5000)
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10))

    // Filtrar por userId externo exige role admin
    if (userIdParam && user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const allMusicas = await db
      .select(listColumns)
      .from(musicas)
      .where(userIdParam ? eq(musicas.userId, userIdParam) : undefined)
      .orderBy(desc(musicas.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ musicas: allMusicas }, { headers: CACHE.MEDIUM })
  } catch (error) {
    console.error("Erro ao buscar músicas:", error)
    return NextResponse.json({ error: "Erro ao buscar músicas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
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
        userId: user.userId,
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

