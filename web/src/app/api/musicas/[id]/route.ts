import { NextRequest, NextResponse } from "next/server"
import { db, musicas, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Buscar usuário completo para verificar role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Buscar música
    const [musica] = await db
      .select()
      .from(musicas)
      .where(eq(musicas.id, id))
      .limit(1)

    if (!musica) {
      return NextResponse.json(
        { error: "Música não encontrada" },
        { status: 404 }
      )
    }

    // Verificar permissão (admin ou dono)
    if (user.role !== "admin" && musica.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: "Sem permissão" },
        { status: 403 }
      )
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

