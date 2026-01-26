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

    // Validar limite de tempo para máquinas
    if (tipo === "maquina" && !limiteTempo) {
      return NextResponse.json(
        { error: "Limite de tempo é obrigatório para chaves de máquina" },
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

    // Se já existe chave para este usuário, atualizar ao invés de criar nova
    if (userId) {
      const [existingKey] = await db
        .select()
        .from(chavesAtivacao)
        .where(
          and(
            eq(chavesAtivacao.userId, userId),
            eq(chavesAtivacao.tipo, tipo)
          )
        )
        .limit(1)

      if (existingKey) {
        // Atualizar chave existente ao invés de criar nova
        const updateData: any = {
          status: "ativa",
          updatedAt: new Date(),
        }
        
        if (tipo === "assinatura" && dataExpiracao) {
          updateData.dataExpiracao = new Date(dataExpiracao)
        }
        
        if (tipo === "maquina" && limiteTempo) {
          updateData.limiteTempo = parseInt(limiteTempo.toString())
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

    // Criar chave
    const [newChave] = await db
      .insert(chavesAtivacao)
      .values({
        chave,
        userId: userId || null,
        tipo,
        status: "ativa",
        limiteTempo: tipo === "maquina" ? limiteTempo : null,
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

