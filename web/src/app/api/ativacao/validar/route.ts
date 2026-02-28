import { NextRequest, NextResponse } from "next/server"
import { db, chavesAtivacao, users, assinaturas } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { normalizarChave, validarFormatoChave } from "@/lib/utils/chave-ativacao"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chave, machineId } = body

    if (!chave) {
      return NextResponse.json(
        { error: "Chave de ativação é obrigatória" },
        { status: 400 }
      )
    }

    const chaveNormalizada = normalizarChave(chave)

    if (!validarFormatoChave(chaveNormalizada)) {
      return NextResponse.json(
        { error: "Formato de chave inválido" },
        { status: 400 }
      )
    }

    // Busca a chave em uma única query
    const [chaveData] = await db
      .select()
      .from(chavesAtivacao)
      .where(eq(chavesAtivacao.chave, chaveNormalizada))
      .limit(1)

    if (!chaveData) {
      return NextResponse.json(
        { error: "Chave de ativação não encontrada" },
        { status: 404 }
      )
    }

    if (chaveData.status !== "ativa") {
      return NextResponse.json(
        { error: "Chave de ativação não está ativa" },
        { status: 400 }
      )
    }

    // ── Machine binding ────────────────────────────────────────────────────
    // machineId é enviado pelo app desktop. Se presente, valida que a chave
    // não está vinculada a outra máquina.
    if (machineId) {
      if (chaveData.machineId && chaveData.machineId !== machineId) {
        return NextResponse.json(
          {
            error: "Chave em uso em outro dispositivo. Contate o administrador para desbloquear.",
            code: "MACHINE_CONFLICT",
          },
          { status: 409 }
        )
      }
    }

    const now = new Date()

    // ── Validações por tipo ────────────────────────────────────────────────
    if (chaveData.tipo === "assinatura") {
      if (chaveData.dataExpiracao && new Date(chaveData.dataExpiracao) < now) {
        await db
          .update(chavesAtivacao)
          .set({ status: "expirada" })
          .where(eq(chavesAtivacao.id, chaveData.id))

        return NextResponse.json(
          { error: "Chave de ativação expirada" },
          { status: 400 }
        )
      }

      // Verifica assinatura do usuário vinculado
      if (chaveData.userId) {
        const [assinatura] = await db
          .select({ status: assinaturas.status })
          .from(assinaturas)
          .where(eq(assinaturas.userId, chaveData.userId))
          .limit(1)

        if (!assinatura || assinatura.status !== "ativa") {
          return NextResponse.json(
            { error: "Assinatura não está ativa" },
            { status: 400 }
          )
        }
      }
    } else if (chaveData.tipo === "maquina") {
      const dataFim = chaveData.dataExpiracao
        ? new Date(chaveData.dataExpiracao)
        : chaveData.dataInicio && chaveData.limiteTempo
          ? new Date(new Date(chaveData.dataInicio).getTime() + chaveData.limiteTempo * 24 * 60 * 60 * 1000)
          : null

      if (dataFim && dataFim <= now) {
        await db
          .update(chavesAtivacao)
          .set({ status: "expirada" })
          .where(eq(chavesAtivacao.id, chaveData.id))

        return NextResponse.json(
          { error: "Limite de tempo da chave excedido" },
          { status: 400 }
        )
      }

      if (chaveData.limiteTempo && !chaveData.dataInicio) {
        // Primeira ativação: inicia contagem e vincula à máquina
        const dataExpiracao = new Date(now.getTime() + chaveData.limiteTempo * 24 * 60 * 60 * 1000)
        await db
          .update(chavesAtivacao)
          .set({
            dataInicio: now,
            dataExpiracao,
            usadoEm: now,
            ultimoUso: now,
            machineId: machineId || chaveData.machineId || null,
          })
          .where(eq(chavesAtivacao.id, chaveData.id))
      } else {
        // Ativações subsequentes: só atualiza ultimo_uso e confirma machine binding
        const updateData: Record<string, unknown> = { ultimoUso: now }
        if (machineId && !chaveData.machineId) {
          updateData.machineId = machineId
        }
        await db
          .update(chavesAtivacao)
          .set(updateData)
          .where(eq(chavesAtivacao.id, chaveData.id))
      }
    }

    // ── Confirma machine binding para chaves de assinatura (primeira vez) ──
    if (chaveData.tipo === "assinatura" && machineId && !chaveData.machineId) {
      await db
        .update(chavesAtivacao)
        .set({ machineId, ultimoUso: now })
        .where(eq(chavesAtivacao.id, chaveData.id))
    } else if (chaveData.tipo === "assinatura") {
      await db
        .update(chavesAtivacao)
        .set({ ultimoUso: now })
        .where(eq(chavesAtivacao.id, chaveData.id))
    }

    // ── Dados do usuário vinculado ─────────────────────────────────────────
    let userData = null
    if (chaveData.userId) {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          userType: users.userType,
        })
        .from(users)
        .where(eq(users.id, chaveData.userId))
        .limit(1)

      userData = user || null
    }

    // ── Dias restantes ─────────────────────────────────────────────────────
    let diasRestantes: number | null = null
    const dataExpiracaoChave = chaveData.dataExpiracao
      ? new Date(chaveData.dataExpiracao)
      : chaveData.tipo === "maquina" && chaveData.dataInicio && chaveData.limiteTempo
        ? new Date(new Date(chaveData.dataInicio).getTime() + chaveData.limiteTempo * 24 * 60 * 60 * 1000)
        : null

    if (dataExpiracaoChave) {
      const diffTime = dataExpiracaoChave.getTime() - now.getTime()
      diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    }

    return NextResponse.json({
      valida: true,
      chave: {
        id: chaveData.id,
        chave: chaveData.chave,
        tipo: chaveData.tipo,
        limiteTempo: chaveData.limiteTempo,
        dataInicio: chaveData.dataInicio,
        dataExpiracao: chaveData.dataExpiracao,
        diasRestantes,
        horasRestantes: null,
      },
      user: userData,
    })
  } catch (error) {
    console.error("Erro ao validar chave:", error)
    return NextResponse.json(
      { error: "Erro ao validar chave" },
      { status: 500 }
    )
  }
}
