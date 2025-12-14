import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Buscar dados completos do usuário do banco
    const [user] = await db
      .select({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        slug: user.slug,
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.image || null,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao buscar usuário" },
      { status: 500 }
    )
  }
}

