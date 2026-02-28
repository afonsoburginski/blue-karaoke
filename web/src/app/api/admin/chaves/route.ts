import { NextRequest, NextResponse } from "next/server"
import { db, chavesAtivacao, users } from "@/lib/db"
import { requireAdmin, CACHE } from "@/lib/api"
import { eq, desc, and, isNotNull } from "drizzle-orm"
import { gerarChaveAtivacao } from "@/lib/utils/chave-ativacao"
import { unstable_cache } from "next/cache"

function buildChavesQuery(tipo: string | null, status: string | null, userId: string | null) {
  const conditions = []
  if (tipo && tipo !== "all") conditions.push(eq(chavesAtivacao.tipo, tipo))
  if (status && status !== "all") conditions.push(eq(chavesAtivacao.status, status))
  if (userId) conditions.push(eq(chavesAtivacao.userId, userId))

  const base = db
    .select({
      id: chavesAtivacao.id,
      chave: chavesAtivacao.chave,
      tipo: chavesAtivacao.tipo,
      status: chavesAtivacao.status,
      limiteTempo: chavesAtivacao.limiteTempo,
      dataInicio: chavesAtivacao.dataInicio,
      dataExpiracao: chavesAtivacao.dataExpiracao,
      usadoEm: chavesAtivacao.usadoEm,
      ultimoUso: chavesAtivacao.ultimoUso,
      machineId: chavesAtivacao.machineId,
      createdAt: chavesAtivacao.createdAt,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(chavesAtivacao)
    .leftJoin(users, eq(chavesAtivacao.userId, users.id))

  const q = conditions.length > 0 ? (base.where(and(...conditions)) as typeof base) : base
  return q.orderBy(desc(chavesAtivacao.createdAt))
}

// Listar todas as chaves (apenas admin)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tipo = searchParams.get("tipo")
  const status = searchParams.get("status")
  const userId = searchParams.get("userId")

  const cacheKey = userId
    ? `chaves:user:${userId}:${tipo ?? "all"}:${status ?? "all"}`
    : `chaves:${tipo ?? "all"}:${status ?? "all"}`

  // Inicia auth e query em paralelo — economiza ~1-2s de latência serial
  const [auth, allChaves] = await Promise.all([
    requireAdmin(),
    unstable_cache(
      () => buildChavesQuery(tipo, status, userId),
      [cacheKey],
      { revalidate: 10 }
    )(),
  ])

  if (auth.error) return auth.error

  return NextResponse.json({ chaves: allChaves }, { headers: CACHE.SHORT })
}

// Criar nova chave de ativação (apenas admin)
// Um usuário pode ter múltiplas chaves — sempre cria uma nova.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const body = await request.json()
    const { tipo, userId, limiteTempo, dataExpiracao } = body

    if (!tipo || !["assinatura", "maquina"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'assinatura' ou 'maquina'" },
        { status: 400 }
      )
    }

    if (tipo === "maquina" && (limiteTempo == null || limiteTempo === "")) {
      return NextResponse.json(
        { error: "Limite em dias é obrigatório para chaves de máquina" },
        { status: 400 }
      )
    }

    if (tipo === "assinatura" && !dataExpiracao) {
      return NextResponse.json(
        { error: "Data de expiração é obrigatória para chaves de assinatura" },
        { status: 400 }
      )
    }

    // Gera chave única (tenta até 10 vezes em caso raro de colisão)
    let chave = gerarChaveAtivacao()
    for (let i = 0; i < 10; i++) {
      const [existing] = await db
        .select({ id: chavesAtivacao.id })
        .from(chavesAtivacao)
        .where(eq(chavesAtivacao.chave, chave))
        .limit(1)
      if (!existing) break
      if (i === 9) {
        return NextResponse.json({ error: "Erro ao gerar chave única" }, { status: 500 })
      }
      chave = gerarChaveAtivacao()
    }

    const [newChave] = await db
      .insert(chavesAtivacao)
      .values({
        chave,
        userId: userId || null,
        tipo,
        status: "ativa",
        limiteTempo: tipo === "maquina" ? parseInt(String(limiteTempo), 10) : null,
        dataExpiracao: tipo === "assinatura" ? new Date(dataExpiracao) : null,
        criadoPor: user.userId,
      })
      .returning()

    return NextResponse.json(
      {
        chave: {
          id: newChave.id,
          chave: newChave.chave,
          tipo: newChave.tipo,
          status: newChave.status,
          limiteTempo: newChave.limiteTempo,
          dataExpiracao: newChave.dataExpiracao,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar chave:", error)
    return NextResponse.json({ error: "Erro ao criar chave" }, { status: 500 })
  }
}

// Deletar chave (apenas admin)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "ID da chave é obrigatório" }, { status: 400 })
    }

    const [deleted] = await db
      .delete(chavesAtivacao)
      .where(eq(chavesAtivacao.id, id))
      .returning({ id: chavesAtivacao.id })

    if (!deleted) {
      return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erro ao deletar chave:", error)
    return NextResponse.json({ error: "Erro ao deletar chave" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/chaves
 *
 * Ações suportadas via campo `action`:
 *  - (sem action) → editar diasRestantes
 *  - "unlock_machine" → remove o vínculo de máquina (machineId → null),
 *    permitindo que a chave seja ativada em outro dispositivo.
 *  - "revogar" → marca a chave como revogada.
 *  - "reativar" → marca a chave como ativa.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { id, action, diasRestantes } = body

    if (!id) {
      return NextResponse.json({ error: "ID da chave é obrigatório" }, { status: 400 })
    }

    const now = new Date()

    // ── Unlock máquina ──────────────────────────────────────────────────────
    if (action === "unlock_machine") {
      const [updated] = await db
        .update(chavesAtivacao)
        .set({ machineId: null, updatedAt: now })
        .where(eq(chavesAtivacao.id, id))
        .returning({ id: chavesAtivacao.id, machineId: chavesAtivacao.machineId })

      if (!updated) {
        return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 })
      }

      return NextResponse.json({ ok: true, machineId: null })
    }

    // ── Revogar / Reativar ──────────────────────────────────────────────────
    if (action === "revogar" || action === "reativar") {
      const novoStatus = action === "revogar" ? "revogada" : "ativa"
      const [updated] = await db
        .update(chavesAtivacao)
        .set({ status: novoStatus, updatedAt: now })
        .where(eq(chavesAtivacao.id, id))
        .returning({ id: chavesAtivacao.id, status: chavesAtivacao.status })

      if (!updated) {
        return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 })
      }

      return NextResponse.json({ ok: true, status: updated.status })
    }

    // ── Editar dias restantes (default) ────────────────────────────────────
    if (diasRestantes == null || typeof diasRestantes !== "number" || diasRestantes < 0) {
      return NextResponse.json(
        { error: "diasRestantes (número >= 0) é obrigatório quando action não é especificada" },
        { status: 400 }
      )
    }

    const dataExpiracao = new Date(now.getTime() + Math.floor(diasRestantes) * 24 * 60 * 60 * 1000)
    const status = diasRestantes > 0 ? "ativa" : "expirada"

    const [updated] = await db
      .update(chavesAtivacao)
      .set({ dataExpiracao, status, updatedAt: now })
      .where(eq(chavesAtivacao.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Chave não encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      chave: {
        id: updated.id,
        dataExpiracao: updated.dataExpiracao,
        diasRestantes: Math.floor(diasRestantes),
      },
    })
  } catch (error) {
    console.error("Erro ao editar chave:", error)
    return NextResponse.json({ error: "Erro ao editar chave" }, { status: 500 })
  }
}
