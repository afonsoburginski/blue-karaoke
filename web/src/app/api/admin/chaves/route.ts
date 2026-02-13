import { NextRequest, NextResponse } from "next/server"
import { db, chavesAtivacao, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and } from "drizzle-orm"
import { gerarChaveAtivacao } from "@/lib/utils/chave-ativacao"

// Listar todas as chaves (apenas admin)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar usuário completo para verificar role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get("tipo") // 'assinatura', 'maquina', 'all'
    const status = searchParams.get("status") // 'ativa', 'expirada', 'revogada', 'all'

    let query = db
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
        createdAt: chavesAtivacao.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(chavesAtivacao)
      .leftJoin(users, eq(chavesAtivacao.userId, users.id))

    // Filtros
    const conditions = []

    if (tipo && tipo !== "all") {
      conditions.push(eq(chavesAtivacao.tipo, tipo))
    }

    if (status && status !== "all") {
      conditions.push(eq(chavesAtivacao.status, status))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const allChaves = await query.orderBy(desc(chavesAtivacao.createdAt))

    return NextResponse.json({ chaves: allChaves })
  } catch (error) {
    console.error("Erro ao buscar chaves:", error)
    return NextResponse.json(
      { error: "Erro ao buscar chaves" },
      { status: 500 }
    )
  }
}

// Criar nova chave de ativação (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar usuário completo para verificar role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tipo, userId, limiteTempo, dataExpiracao } = body

    if (!tipo || !["assinatura", "maquina"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'assinatura' ou 'maquina'" },
        { status: 400 }
      )
    }

    // Validar limite (dias) para máquinas
    if (tipo === "maquina" && (limiteTempo == null || limiteTempo === "")) {
      return NextResponse.json(
        { error: "Limite em dias é obrigatório para chaves de máquina" },
        { status: 400 }
      )
    }

    // Validar data de expiração para assinaturas
    if (tipo === "assinatura" && !dataExpiracao) {
      return NextResponse.json(
        { error: "Data de expiração é obrigatória para chaves de assinatura" },
        { status: 400 }
      )
    }

    // Se já existe chave para este usuário, atualizar (permite mudar tipo: assinatura ↔ maquina)
    if (userId) {
      const [existingKey] = await db
        .select()
        .from(chavesAtivacao)
        .where(eq(chavesAtivacao.userId, userId))
        .limit(1)

      if (existingKey) {
        const updateData: any = {
          tipo,
          status: "ativa",
          updatedAt: new Date(),
        }

        if (tipo === "assinatura") {
          updateData.dataExpiracao = dataExpiracao ? new Date(dataExpiracao) : null
          updateData.limiteTempo = null
          updateData.dataInicio = null
        } else {
          updateData.limiteTempo = limiteTempo != null ? parseInt(limiteTempo.toString(), 10) : null
          updateData.dataExpiracao = null
          // dataInicio permanece; ao trocar para máquina, dias restantes usam limiteTempo até primeiro uso
        }

        const [updatedChave] = await db
          .update(chavesAtivacao)
          .set(updateData)
          .where(eq(chavesAtivacao.id, existingKey.id))
          .returning()

        return NextResponse.json(
          {
            chave: {
              id: updatedChave.id,
              chave: updatedChave.chave,
              tipo: updatedChave.tipo,
              status: updatedChave.status,
              limiteTempo: updatedChave.limiteTempo,
              dataExpiracao: updatedChave.dataExpiracao,
            },
            message: "Chave atualizada com sucesso",
          },
          { status: 200 }
        )
      }
    }

    // Gerar chave única
    let chave = gerarChaveAtivacao()
    let tentativas = 0
    const maxTentativas = 10

    // Garantir que a chave é única
    while (tentativas < maxTentativas) {
      const existing = await db
        .select()
        .from(chavesAtivacao)
        .where(eq(chavesAtivacao.chave, chave))
        .limit(1)

      if (existing.length === 0) {
        break
      }

      chave = gerarChaveAtivacao()
      tentativas++
    }

    if (tentativas >= maxTentativas) {
      return NextResponse.json(
        { error: "Erro ao gerar chave única" },
        { status: 500 }
      )
    }

    // Criar chave (máquina: limiteTempo em dias; assinatura: dataExpiracao)
    const [newChave] = await db
      .insert(chavesAtivacao)
      .values({
        chave,
        userId: userId || null,
        tipo,
        status: "ativa",
        limiteTempo: tipo === "maquina" ? parseInt(String(limiteTempo), 10) : null,
        dataExpiracao: tipo === "assinatura" ? new Date(dataExpiracao) : null,
        criadoPor: currentUser.userId,
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
    return NextResponse.json(
      { error: "Erro ao criar chave" },
      { status: 500 }
    )
  }
}

// Deletar chave (apenas admin)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { error: "ID da chave é obrigatório" },
        { status: 400 }
      )
    }
    const [deleted] = await db
      .delete(chavesAtivacao)
      .where(eq(chavesAtivacao.id, id))
      .returning({ id: chavesAtivacao.id })
    if (!deleted) {
      return NextResponse.json(
        { error: "Chave não encontrada" },
        { status: 404 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Erro ao deletar chave:", error)
    return NextResponse.json(
      { error: "Erro ao deletar chave" },
      { status: 500 }
    )
  }
}

// Editar dias restantes (apenas admin), tudo por dia
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { id, diasRestantes } = body
    if (!id || diasRestantes == null || typeof diasRestantes !== "number" || diasRestantes < 0) {
      return NextResponse.json(
        { error: "ID da chave e diasRestantes (número >= 0) são obrigatórios" },
        { status: 400 }
      )
    }
    const now = new Date()
    const dataExpiracao = new Date(
      now.getTime() + Math.floor(diasRestantes) * 24 * 60 * 60 * 1000
    )
    // Ao estender a chave, marcar como ativa se a nova expiração for no futuro
    const status = diasRestantes > 0 ? "ativa" : "expirada"
    const [updated] = await db
      .update(chavesAtivacao)
      .set({
        dataExpiracao,
        status,
        updatedAt: now,
      })
      .where(eq(chavesAtivacao.id, id))
      .returning()
    if (!updated) {
      return NextResponse.json(
        { error: "Chave não encontrada" },
        { status: 404 }
      )
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
    return NextResponse.json(
      { error: "Erro ao editar chave" },
      { status: 500 }
    )
  }
}
