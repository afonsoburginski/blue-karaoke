import { NextRequest, NextResponse } from "next/server"
import { db, users, assinaturas, account } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { eq, desc, and, or } from "drizzle-orm"
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

    let query = db
      .select({
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
      })
      .from(users)

    // Filtros
    const conditions = []

    if (tipo && tipo !== "all") {
      conditions.push(eq(users.userType, tipo))
    }

    if (status && status !== "all") {
      conditions.push(eq(users.isActive, status === "active"))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const allUsers = await query.orderBy(desc(users.createdAt))

    // Buscar assinaturas para cada usuário
    const usersWithSubscriptions = await Promise.all(
      allUsers.map(async (user) => {
        const [assinatura] = await db
          .select()
          .from(assinaturas)
          .where(eq(assinaturas.userId, user.id))
          .limit(1)

        return {
          ...user,
          assinatura: assinatura || null,
        }
      })
    )

    return NextResponse.json({ usuarios: usersWithSubscriptions })
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

