import { NextRequest, NextResponse } from "next/server"
import { db, users, assinaturas, account, chavesAtivacao } from "@/lib/db"
import { requireAdmin, CACHE } from "@/lib/api"
import { hashPassword } from "@/lib/auth"
import { eq, desc, and, inArray } from "drizzle-orm"
import { createSlug } from "@/lib/slug"
import { createId } from "@paralleldrive/cuid2"

// Colunas de usuário necessárias para a listagem (menos payload)
const userListColumns = {
  id: users.id,
  slug: users.slug,
  name: users.name,
  email: users.email,
  avatar: users.avatar,
  role: users.role,
  userType: users.userType,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

// Listar todos os usuários (apenas admin)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get("tipo")
    const status = searchParams.get("status")

    const conditions = []
    if (tipo && tipo !== "all") conditions.push(eq(users.userType, tipo))
    if (status && status !== "all") conditions.push(eq(users.isActive, status === "active"))

    let usersQuery = db.select(userListColumns).from(users)
    if (conditions.length > 0) {
      usersQuery = usersQuery.where(and(...conditions)) as typeof usersQuery
    }
    const allUsersData = await usersQuery.orderBy(desc(users.createdAt))

    const userIds = allUsersData.map((u) => u.id)

    // Assinaturas e chaves em paralelo (reduz tempo total)
    const [allAssinaturas, allChaves] =
      userIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(assinaturas)
              .where(inArray(assinaturas.userId, userIds))
              .orderBy(desc(assinaturas.createdAt)),
            db
              .select()
              .from(chavesAtivacao)
              .where(inArray(chavesAtivacao.userId, userIds))
              .orderBy(desc(chavesAtivacao.createdAt)),
          ])
        : [[], []]


    const assinaturasMap = new Map<string, (typeof allAssinaturas)[number]>()
    for (const assinatura of allAssinaturas) {
      if (!assinaturasMap.has(assinatura.userId)) assinaturasMap.set(assinatura.userId, assinatura)
    }

    const chavesMap = new Map<string, (typeof allChaves)[number]>()
    for (const chave of allChaves) {
      if (chave.userId && !chavesMap.has(chave.userId)) chavesMap.set(chave.userId, chave)
    }


    // Para cada usuário, buscar assinatura e chave mais recente dos mapas
    const usersWithDetails = allUsersData.map((user) => {
      try {
        const assinatura = assinaturasMap.get(user.id) || null
        const chave = chavesMap.get(user.id) || null
        

        // Calcular dias restantes e data ativação
        let diasRestantes: number | null = null
        let dataAtivacao: Date | null = null

        if (assinatura?.dataFim) {
          const hoje = new Date()
          const dataFim = new Date(assinatura.dataFim)
          const diffTime = dataFim.getTime() - hoje.getTime()
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diasRestantes < 0) diasRestantes = 0
          dataAtivacao = assinatura.dataInicio ? new Date(assinatura.dataInicio) : null
        } else if (chave) {
          if (chave.dataExpiracao) {
            // Assinatura ou chave com data fixa
            const hoje = new Date()
            const dataFim = new Date(chave.dataExpiracao)
            const diffTime = dataFim.getTime() - hoje.getTime()
            diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diasRestantes < 0) diasRestantes = 0
            dataAtivacao = chave.usadoEm ? new Date(chave.usadoEm) : null
          } else if (chave.tipo === "maquina" && chave.limiteTempo != null) {
            // Máquina: dias = até dataInicio + limiteTempo, ou limiteTempo se ainda não usou
            if (chave.dataInicio) {
              const inicio = new Date(chave.dataInicio).getTime()
              const fim = inicio + chave.limiteTempo * 24 * 60 * 60 * 1000
              const hoje = Date.now()
              diasRestantes = Math.max(0, Math.ceil((fim - hoje) / (24 * 60 * 60 * 1000)))
              dataAtivacao = new Date(chave.dataInicio)
            } else {
              diasRestantes = chave.limiteTempo
              dataAtivacao = null
            }
          }
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
            limiteTempo: chave.limiteTempo,
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

    return NextResponse.json(
      { usuarios: usersWithDetails },
      { headers: CACHE.SHORT }
    )
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 })
  }
}

// Criar novo usuário (apenas admin)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
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
