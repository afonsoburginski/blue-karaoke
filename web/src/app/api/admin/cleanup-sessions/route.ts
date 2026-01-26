import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { performFullCleanup } from "@/lib/session-cleanup"

/**
 * POST /api/admin/cleanup-sessions
 * Limpa sessões expiradas e antigas (apenas admin)
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const { db } = await import("@/lib/db")
    const { users } = await import("@/lib/db/schema")
    const { eq } = await import("drizzle-orm")

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem executar esta ação." },
        { status: 403 }
      )
    }

    // Executar limpeza
    const maxSessions = parseInt(request.nextUrl.searchParams.get("maxSessions") || "5", 10)
    const stats = await performFullCleanup(maxSessions)

    return NextResponse.json({
      success: true,
      stats,
      message: `Limpeza concluída: ${stats.expiredSessionsRemoved} sessões expiradas removidas, ${stats.oldSessionsRemoved} sessões antigas removidas de ${stats.usersAffected} usuários`,
    })
  } catch (error: any) {
    console.error("Erro ao limpar sessões:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao limpar sessões" },
      { status: 500 }
    )
  }
}
