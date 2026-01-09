import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chavesAtivacao, assinaturas, users } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

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
    const userId = searchParams.get("userId") || currentUser.userId

    // Verificar role do usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // Se for admin, retornar sucesso sem chave (admin não precisa de chave)
    if (user && user.role === "admin") {
      return NextResponse.json({
        chave: null,
        dataExpiracao: null,
        status: "ativa",
        isAdmin: true,
      })
    }

    // Verificar se o usuário tem assinatura ativa
    const [subscription] = await db
      .select()
      .from(assinaturas)
      .where(eq(assinaturas.userId, userId))
      .orderBy(desc(assinaturas.dataInicio))
      .limit(1)

    if (!subscription) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      )
    }

    // Buscar chave de ativação do tipo "assinatura" para este usuário
    const [chave] = await db
      .select()
      .from(chavesAtivacao)
      .where(
        and(
          eq(chavesAtivacao.userId, userId),
          eq(chavesAtivacao.tipo, "assinatura")
        )
      )
      .limit(1)

    if (!chave) {
      return NextResponse.json(
        { error: "Chave não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      chave: chave.chave,
      dataExpiracao: chave.dataExpiracao,
      status: chave.status,
    })
  } catch (error: any) {
    console.error("Erro ao buscar chave:", error)
    return NextResponse.json(
      {
        error: "Erro ao buscar chave",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

