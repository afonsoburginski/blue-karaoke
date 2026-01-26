import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { cleanupOldSessionsAfterLogin } from "@/lib/auth-session-cleanup"
import { auth } from "@/lib/auth"

/**
 * POST /api/auth/cleanup-sessions
 * Limpa sessões antigas do usuário atual após login
 * Esta rota é chamada automaticamente após login bem-sucedido
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se o usuário está autenticado
    const { headers } = await import("next/headers")
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session?.session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Limpar sessões antigas
    await cleanupOldSessionsAfterLogin(session.user.id, session.session.id)

    return NextResponse.json({
      success: true,
      message: "Sessões antigas limpas com sucesso",
    })
  } catch (error: any) {
    console.error("Erro ao limpar sessões:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao limpar sessões" },
      { status: 500 }
    )
  }
}
