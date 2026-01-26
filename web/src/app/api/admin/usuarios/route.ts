import { NextRequest, NextResponse } from "next/server"
import { db, users, assinaturas, account, chavesAtivacao } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and, inArray } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { createSlug } from "@/lib/slug"
import { createId } from "@paralleldrive/cuid2"

// Listar todos os usuários (apenas admin)
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

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get("tipo") // 'subscriber', 'machine', 'all'
    const status = searchParams.get("status") // 'active', 'inactive', 'all'

    // Buscar todos os usuários com LEFT JOIN para assinaturas e chaves
    const conditions = []

    if (tipo && tipo !== "all") {
      conditions.push(eq(users.userType, tipo))
    }

    if (status && status !== "all") {
      conditions.push(eq(users.isActive, status === "active"))
    }

    // Buscar usuários primeiro
    // Os índices idx_users_type_active e idx_users_role otimizam estas queries
    let usersQuery = db
      .select()
      .from(users)

    if (conditions.length > 0) {
      usersQuery = usersQuery.where(and(...conditions)) as typeof usersQuery
    }

    const allUsersData = await usersQuery.orderBy(desc(users.createdAt))

    // Otimizar: buscar todas as assinaturas e chaves de uma vez usando inArray
    // Os índices idx_assinaturas_user_created e idx_chaves_user_created otimizam estas queries
    const userIds = allUsersData.map(u => u.id)
    
    // Buscar todas as assinaturas relevantes de uma vez
    const allAssinaturas = userIds.length > 0 ? await db
      .select()
      .from(assinaturas)
      .where(inArray(assinaturas.userId, userIds))
      .orderBy(desc(assinaturas.createdAt)) : []

    // Buscar todas as chaves relevantes de uma vez
    // Buscar chaves onde userId está na lista OU é null (chaves não associadas ainda)
    const allChaves = userIds.length > 0 ? await db
      .select()
      .from(chavesAtivacao)
      .where(inArray(chavesAtivacao.userId, userIds))
      .orderBy(desc(chavesAtivacao.createdAt)) : []


    // Criar mapas para acesso rápido O(1)
    const assinaturasMap = new Map<string, typeof allAssinaturas[0]>()
    for (const assinatura of allAssinaturas) {
      if (!assinaturasMap.has(assinatura.userId)) {
        assinaturasMap.set(assinatura.userId, assinatura)
      }
    }

    const chavesMap = new Map<string, typeof allChaves[0]>()
    for (const chave of allChaves) {
      // Garantir que userId existe e usar a chave mais recente (já ordenado por createdAt DESC)
      if (chave.userId) {
        // Se já existe uma chave para este userId, manter a mais recente (primeira do array ordenado)
        if (!chavesMap.has(chave.userId)) {
          chavesMap.set(chave.userId, chave)
        }
      }
    }


    // Para cada usuário, buscar assinatura e chave mais recente dos mapas
    const usersWithDetails = allUsersData.map((user) => {
      try {
        const assinatura = assinaturasMap.get(user.id) || null
        const chave = chavesMap.get(user.id) || null
        

        // Calcular dias restantes
        let diasRestantes: number | null = null
        let dataAtivacao: Date | null = null

        if (assinatura?.dataFim) {
          const hoje = new Date()
          const dataFim = new Date(assinatura.dataFim)
          const diffTime = dataFim.getTime() - hoje.getTime()
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diasRestantes < 0) diasRestantes = 0
          dataAtivacao = assinatura.dataInicio ? new Date(assinatura.dataInicio) : null
        } else if (chave?.dataExpiracao) {
          const hoje = new Date()
          const dataFim = new Date(chave.dataExpiracao)
          const diffTime = dataFim.getTime() - hoje.getTime()
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diasRestantes < 0) diasRestantes = 0
          dataAtivacao = chave.usadoEm ? new Date(chave.usadoEm) : null
        }

        return {
          id: user.id,
          slug: user.slug,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          userType: user.userType,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          assinatura: assinatura ? {
            id: assinatura.id,
            plano: assinatura.plano,
            status: assinatura.status,
            dataInicio: assinatura.dataInicio,
            dataFim: assinatura.dataFim,
            valor: assinatura.valor,
            renovacaoAutomatica: assinatura.renovacaoAutomatica,
          } : null,
          chaveAtivacao: chave ? {
            id: chave.id,
            chave: chave.chave,
            tipo: chave.tipo,
            status: chave.status,
            dataExpiracao: chave.dataExpiracao,
            usadoEm: chave.usadoEm,
            ultimoUso: chave.ultimoUso,
          } : null,
          diasRestantes,
          dataAtivacao,
        }
      } catch (error) {
        console.error(`[admin/usuarios] Erro ao processar usuário ${user.id}:`, error)
        // Retornar usuário básico mesmo se houver erro ao buscar assinatura/chave
        return {
          id: user.id,
          slug: user.slug,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          userType: user.userType,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          assinatura: null,
          chaveAtivacao: null,
          diasRestantes: null,
          dataAtivacao: null,
        }
      }
    })

    const totalUsuarios = usersWithDetails.length
    return NextResponse.json({ usuarios: usersWithDetails })
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    )
  }
}

// Criar novo usuário (apenas admin)
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
    const { name, email, password, userType, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      )
    }

    // Criar slug
    const slug = createSlug(name)

    // Verificar se slug já existe
    const existingSlug = await db
      .select()
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1)

    if (existingSlug.length > 0) {
      return NextResponse.json(
        { error: "Nome de usuário já existe" },
        { status: 400 }
      )
    }

    // Gerar ID único (CUID)
    const userId = createId()

    // Hash da senha
    const hashedPassword = await hashPassword(password)

    // Criar usuário (sem password - será criado na tabela account)
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        slug,
        name,
        email,
        emailVerified: false,
        role: role || "user",
        userType: userType || "subscriber",
        isActive: true,
      })
      .returning()

    // Criar conta com senha no Better Auth
    await db
      .insert(account)
      .values({
        id: createId(),
        accountId: email,
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
      })

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          slug: newUser.slug,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          userType: newUser.userType,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    )
  }
}
