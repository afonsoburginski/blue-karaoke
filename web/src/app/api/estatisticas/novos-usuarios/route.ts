import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { desc, sql } from "drizzle-orm"

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
      .where(sql`${users.id} = ${currentUser.userId}`)
      .limit(1)

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")

    // Buscar novos usuários (últimos cadastrados)
    const novosUsuarios = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        slug: users.slug,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)

    return NextResponse.json({
      usuarios: novosUsuarios.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        slug: u.slug,
        role: u.role,
        createdAt: u.createdAt,
      })),
    })
  } catch (error) {
    console.error("Erro ao buscar novos usuários:", error)
    return NextResponse.json(
      { error: "Erro ao buscar novos usuários" },
      { status: 500 }
    )
  }
}

