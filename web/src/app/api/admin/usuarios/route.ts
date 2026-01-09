import { NextRequest, NextResponse } from "next/server"
import { db, users, assinaturas, account, chavesAtivacao } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and } from "drizzle-orm"
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

    if (!user || user.role !== "admin") {
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

    // Query otimizada com LEFT JOIN
    const allUsersQuery = db
      .select({
        // Dados do usuário
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
        // Dados da assinatura
        assinaturaId: assinaturas.id,
        assinaturaPlano: assinaturas.plano,
        assinaturaStatus: assinaturas.status,
        assinaturaDataInicio: assinaturas.dataInicio,
        assinaturaDataFim: assinaturas.dataFim,
        assinaturaValor: assinaturas.valor,
        assinaturaRenovacao: assinaturas.renovacaoAutomatica,
        // Dados da chave de ativação
        chaveId: chavesAtivacao.id,
        chave: chavesAtivacao.chave,
        chaveTipo: chavesAtivacao.tipo,
        chaveStatus: chavesAtivacao.status,
        chaveDataExpiracao: chavesAtivacao.dataExpiracao,
        chaveUsadoEm: chavesAtivacao.usadoEm,
        chaveUltimoUso: chavesAtivacao.ultimoUso,
      })
      .from(users)
      .leftJoin(assinaturas, eq(assinaturas.userId, users.id))
      .leftJoin(chavesAtivacao, eq(chavesAtivacao.userId, users.id))
      .orderBy(desc(users.createdAt))

    const allUsers = conditions.length > 0
      ? await allUsersQuery.where(and(...conditions))
      : await allUsersQuery

    // Processar resultados
    const usersWithDetails = allUsers.map((row) => {
      // Calcular dias restantes
      let diasRestantes: number | null = null
      let dataAtivacao: Date | null = null

      if (row.assinaturaDataFim) {
        const hoje = new Date()
        const dataFim = new Date(row.assinaturaDataFim)
        const diffTime = dataFim.getTime() - hoje.getTime()
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diasRestantes < 0) diasRestantes = 0
        dataAtivacao = row.assinaturaDataInicio ? new Date(row.assinaturaDataInicio) : null
      } else if (row.chaveDataExpiracao) {
        const hoje = new Date()
        const dataFim = new Date(row.chaveDataExpiracao)
        const diffTime = dataFim.getTime() - hoje.getTime()
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diasRestantes < 0) diasRestantes = 0
        dataAtivacao = row.chaveUsadoEm ? new Date(row.chaveUsadoEm) : null
      }

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        email: row.email,
        avatar: row.avatar,
        role: row.role,
        userType: row.userType,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assinatura: row.assinaturaId ? {
          id: row.assinaturaId,
          plano: row.assinaturaPlano,
          status: row.assinaturaStatus,
          dataInicio: row.assinaturaDataInicio,
          dataFim: row.assinaturaDataFim,
          valor: row.assinaturaValor,
          renovacaoAutomatica: row.assinaturaRenovacao,
        } : null,
        chaveAtivacao: row.chaveId ? {
          id: row.chaveId,
          chave: row.chave,
          tipo: row.chaveTipo,
          status: row.chaveStatus,
          dataExpiracao: row.chaveDataExpiracao,
          usadoEm: row.chaveUsadoEm,
          ultimoUso: row.chaveUltimoUso,
        } : null,
        diasRestantes,
        dataAtivacao,
      }
    })

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

