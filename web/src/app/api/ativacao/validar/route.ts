import { NextRequest, NextResponse } from "next/server"
import { db, chavesAtivacao, users, assinaturas } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { normalizarChave, validarFormatoChave } from "@/lib/utils/chave-ativacao"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chave } = body

    if (!chave) {
      return NextResponse.json(
        { error: "Chave de ativação é obrigatória" },
        { status: 400 }
      )
    }

    // Normalizar chave
    const chaveNormalizada = normalizarChave(chave)

    if (!validarFormatoChave(chaveNormalizada)) {
      return NextResponse.json(
        { error: "Formato de chave inválido" },
        { status: 400 }
      )
    }

    // Buscar chave
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

    // Verificar status
    if (chaveData.status !== "ativa") {
      return NextResponse.json(
        { error: "Chave de ativação não está ativa" },
        { status: 400 }
      )
    }

    const now = new Date()

    // Validações por tipo
    if (chaveData.tipo === "assinatura") {
      // Verificar expiração
      if (chaveData.dataExpiracao && new Date(chaveData.dataExpiracao) < now) {
        // Atualizar status
        await db
          .update(chavesAtivacao)
          .set({ status: "expirada" })
          .where(eq(chavesAtivacao.id, chaveData.id))

        return NextResponse.json(
          { error: "Chave de ativação expirada" },
          { status: 400 }
        )
      }

      // Verificar assinatura do usuário
      if (chaveData.userId) {
        const [assinatura] = await db
          .select()
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
      // Verificar limite de tempo
      if (chaveData.limiteTempo && chaveData.dataInicio) {
        const horasUsadas =
          (now.getTime() - new Date(chaveData.dataInicio).getTime()) /
          (1000 * 60 * 60)

        if (horasUsadas >= chaveData.limiteTempo) {
          // Atualizar status
          await db
            .update(chavesAtivacao)
            .set({ status: "expirada" })
            .where(eq(chavesAtivacao.id, chaveData.id))

          return NextResponse.json(
            { error: "Limite de tempo da chave excedido" },
            { status: 400 }
          )
        }
      } else if (chaveData.limiteTempo && !chaveData.dataInicio) {
        // Primeira vez usando - iniciar contagem
        await db
          .update(chavesAtivacao)
          .set({
            dataInicio: now,
            usadoEm: now,
            ultimoUso: now,
          })
          .where(eq(chavesAtivacao.id, chaveData.id))
      } else {
        // Atualizar último uso
        await db
          .update(chavesAtivacao)
          .set({ ultimoUso: now })
          .where(eq(chavesAtivacao.id, chaveData.id))
      }
    }

    // Buscar dados do usuário se existir
    let userData = null
    if (chaveData.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, chaveData.userId))
        .limit(1)

      userData = user
    }

    // Calcular dias restantes para chaves de assinatura
    let diasRestantes: number | null = null
    if (chaveData.tipo === "assinatura" && chaveData.dataExpiracao) {
      const dataExpiracao = new Date(chaveData.dataExpiracao)
      const diffTime = dataExpiracao.getTime() - now.getTime()
      diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    }

    // Calcular horas restantes para chaves de máquina
    const horasRestantes =
      chaveData.tipo === "maquina" && chaveData.limiteTempo && chaveData.dataInicio
        ? Math.max(
            0,
            chaveData.limiteTempo -
              (now.getTime() - new Date(chaveData.dataInicio).getTime()) /
                (1000 * 60 * 60)
          )
        : null

    // Atualizar último uso para chaves de assinatura
    if (chaveData.tipo === "assinatura") {
      await db
        .update(chavesAtivacao)
        .set({ ultimoUso: now })
        .where(eq(chavesAtivacao.id, chaveData.id))
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
        diasRestantes, // Dias restantes para assinatura
        horasRestantes, // Horas restantes para máquina
      },
      user: userData
        ? {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            userType: userData.userType,
          }
        : null,
    })
  } catch (error) {
    console.error("Erro ao validar chave:", error)
    return NextResponse.json(
      { error: "Erro ao validar chave" },
      { status: 500 }
    )
  }
}

