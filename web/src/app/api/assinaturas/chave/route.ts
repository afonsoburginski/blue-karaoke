import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chavesAtivacao, assinaturas } from "@/lib/db/schema"
import { requireAuth, CACHE } from "@/lib/api"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || user.userId

    // Admin não precisa de chave — zero queries ao DB
    if (user.role === "admin") {
      return NextResponse.json(
        { chave: null, dataExpiracao: null, status: "ativa", isAdmin: true },
        { headers: CACHE.SHORT }
      )
    }

    // Busca assinatura ativa e chaves em paralelo
    const [subscription, chave] = await Promise.all([
      db
        .select({ id: assinaturas.id, status: assinaturas.status })
        .from(assinaturas)
        .where(eq(assinaturas.userId, userId))
        .orderBy(desc(assinaturas.dataInicio))
        .limit(1)
        .then((r) => r[0] ?? null),

      db
        .select({
          chave: chavesAtivacao.chave,
          dataExpiracao: chavesAtivacao.dataExpiracao,
          status: chavesAtivacao.status,
          machineId: chavesAtivacao.machineId,
        })
        .from(chavesAtivacao)
        .where(
          and(
            eq(chavesAtivacao.userId, userId),
            eq(chavesAtivacao.tipo, "assinatura")
          )
        )
        .orderBy(desc(chavesAtivacao.createdAt))
        .limit(1)
        .then((r) => r[0] ?? null),
    ])

    if (!subscription) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      )
    }

    if (!chave) {
      return NextResponse.json(
        { error: "Chave não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        chave: chave.chave,
        dataExpiracao: chave.dataExpiracao,
        status: chave.status,
      },
      { headers: CACHE.SHORT }
    )
  } catch (error: any) {
    console.error("Erro ao buscar chave:", error)
    return NextResponse.json(
      { error: "Erro ao buscar chave", details: error.message },
      { status: 500 }
    )
  }
}
