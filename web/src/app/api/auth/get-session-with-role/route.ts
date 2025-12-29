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

    // Buscar role e slug do banco
    const [fullUser] = await db
      .select({
        role: users.role,
        slug: users.slug,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (fullUser) {
      return NextResponse.json({
        session: {
          ...session,
          user: {
            ...session.user,
            role: fullUser.role,
            slug: fullUser.slug,
          },
        },
      })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Erro ao buscar sessão:", error)
    return NextResponse.json(
      { error: "Erro ao buscar sessão" },
      { status: 500 }
    )
  }
}

