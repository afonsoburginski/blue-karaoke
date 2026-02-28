import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assinaturas } from "@/lib/db/schema"
import { requireAuth, CACHE } from "@/lib/api"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || user.userId

    // Admin sempre tem assinatura infinita — sem query ao DB
    if (user.role === "admin") {
      return NextResponse.json(
        {
          hasSubscription: true,
          subscription: {
            id: "admin-infinite",
            plano: "admin",
            status: "ativa",
            dataInicio: new Date(),
            dataFim: new Date("2099-12-31T23:59:59"),
            isActive: true,
          },
        },
        { headers: CACHE.SHORT }
      )
    }

    const [subscription] = await db
      .select()
      .from(assinaturas)
      .where(eq(assinaturas.userId, userId))
      .orderBy(desc(assinaturas.dataInicio))
      .limit(1)

    if (!subscription) {
      return NextResponse.json({ hasSubscription: false }, { headers: CACHE.SHORT })
    }

    const now = new Date()
    const dataFim = new Date(subscription.dataFim)
    const isInfinite = dataFim.getTime() > new Date("2090-01-01").getTime()
    const isActive =
      (subscription.status === "ativa" || subscription.status === "pendente") &&
      (isInfinite || dataFim.getTime() > now.getTime())

    return NextResponse.json(
      {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          plano: subscription.plano,
          status: subscription.status,
          dataInicio: subscription.dataInicio,
          dataFim: subscription.dataFim,
          isActive,
        },
      },
      { headers: CACHE.SHORT }
    )
  } catch (error: any) {
    console.error("Erro ao verificar assinatura:", error)
    return NextResponse.json(
      { error: "Erro ao verificar assinatura", details: error.message },
      { status: 500 }
    )
  }
}
