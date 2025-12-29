import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assinaturas } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
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

    // Buscar assinatura mais recente do usuário
    const [subscription] = await db
      .select()
      .from(assinaturas)
      .where(eq(assinaturas.userId, userId))
      .orderBy(desc(assinaturas.dataInicio))
      .limit(1)

    if (!subscription) {
      return NextResponse.json(
        { hasSubscription: false },
        { status: 200 }
      )
    }

    // Verificar se a assinatura está ativa
    const now = new Date()
    const dataFim = new Date(subscription.dataFim)
    // Assinatura está ativa se: status é "ativa" ou "pendente" E data_fim é maior que agora
    const isActive = 
      (subscription.status === "ativa" || subscription.status === "pendente") && 
      dataFim.getTime() > now.getTime()

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plano: subscription.plano,
        status: subscription.status,
        dataInicio: subscription.dataInicio,
        dataFim: subscription.dataFim,
        isActive,
      },
    })
  } catch (error: any) {
    console.error("Erro ao verificar assinatura:", error)
    return NextResponse.json(
      {
        error: "Erro ao verificar assinatura",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

