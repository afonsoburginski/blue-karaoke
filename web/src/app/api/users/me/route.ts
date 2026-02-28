import { NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { requireAuth, CACHE } from "@/lib/api"
import { eq } from "drizzle-orm"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  try {
    // Busca apenas os campos extras não presentes na sessão (avatar/image)
    const [dbUser] = await db
      .select({
        avatar: users.avatar,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1)

    return NextResponse.json(
      {
        user: {
          id: user.userId,
          slug: user.slug,
          name: user.name,
          email: user.email,
          avatar: dbUser?.avatar || dbUser?.image || null,
          role: user.role,
        },
      },
      { headers: CACHE.SHORT }
    )
  } catch (error) {
    console.error("Erro ao buscar usuário:", error)
    return NextResponse.json({ error: "Erro ao buscar usuário" }, { status: 500 })
  }
}
