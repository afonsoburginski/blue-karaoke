import { NextRequest, NextResponse } from "next/server"
import { db, musicas, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, and, ne } from "drizzle-orm"

async function getMusicaAndCheckAuth(id: string, currentUser: { userId: string; role: string }) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, currentUser.userId))
    .limit(1)

  if (!user) {
    return { error: "Usuário não encontrado" as const, status: 404 as const, musica: null, user: null }
  }

  const [musica] = await db
    .select()
    .from(musicas)
    .where(eq(musicas.id, id))
    .limit(1)

  if (!musica) {
    return { error: "Música não encontrada" as const, status: 404 as const, musica: null, user: null }
  }

  if (user.role !== "admin" && musica.userId !== currentUser.userId) {
    return { error: "Sem permissão" as const, status: 403 as const, musica: null, user: null }
  }

  return { error: null, status: 200 as const, musica, user }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { id } = await params
    const result = await getMusicaAndCheckAuth(id, currentUser)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const body = await request.json()
    const { titulo, artista, codigo } = body as { titulo?: string; artista?: string; codigo?: string }

    const updates: { titulo?: string; artista?: string; codigo?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (typeof titulo === "string" && titulo.trim()) updates.titulo = titulo.trim()
    if (typeof artista === "string" && artista.trim()) updates.artista = artista.trim()
    if (typeof codigo === "string" && codigo.trim()) {
      // Código é único: não pode duplicar outro registro (exceto o próprio)
      const [existing] = await db
        .select({ id: musicas.id })
        .from(musicas)
        .where(and(eq(musicas.codigo, codigo.trim()), ne(musicas.id, id)))
        .limit(1)
      if (existing) {
        return NextResponse.json({ error: "Código já existe" }, { status: 400 })
      }
      updates.codigo = codigo.trim()
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 })
    }

    const [updated] = await db
      .update(musicas)
      .set(updates)
      .where(eq(musicas.id, id))
      .returning()

    return NextResponse.json({ musica: updated })
  } catch (error) {
    console.error("Erro ao atualizar música:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar música" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { id } = await params
    const result = await getMusicaAndCheckAuth(id, currentUser)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await db.delete(musicas).where(eq(musicas.id, id))

    return NextResponse.json({ message: "Música deletada com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar música:", error)
    return NextResponse.json(
      { error: "Erro ao deletar música" },
      { status: 500 }
    )
  }
}

