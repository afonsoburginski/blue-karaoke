import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar usuário completo para verificar role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    // Permitir deletar se for admin OU se for o próprio usuário
    if (!user || (user.role !== "admin" && user.email !== email)) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Buscar usuário a ser deletado
    const [userToDelete] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Deletar usuário (cascade vai deletar assinaturas, histórico, etc)
    await db
      .delete(users)
      .where(eq(users.id, userToDelete.id))

    return NextResponse.json({
      success: true,
      message: `Usuário ${email} deletado com sucesso`,
    })
  } catch (error: any) {
    console.error("Erro ao deletar usuário:", error)
    return NextResponse.json(
      {
        error: "Erro ao deletar usuário",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

