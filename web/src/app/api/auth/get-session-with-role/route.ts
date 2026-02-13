import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"

const CACHE_MAX_AGE = 60
const STALE_WHILE_REVALIDATE = 120

/**
 * Sessão com role e slug em uma única resposta.
 * Better Auth já usa cookie cache (5 min); evita query extra quando user tem role/slug.
 * Cache-Control para o cliente não bater no servidor a cada navegação.
 */
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

    const user = session.user as { id: string; role?: string; slug?: string }
    const hasRoleAndSlug = user.role != null && user.slug != null

    if (hasRoleAndSlug) {
      return NextResponse.json(
        { session },
        {
          headers: {
            "Cache-Control": `private, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
          },
        }
      )
    }

    const [fullUser] = await db
      .select({ role: users.role, slug: users.slug })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    const payload = {
      session: {
        ...session,
        user: {
          ...session.user,
          role: fullUser?.role ?? "user",
          slug: fullUser?.slug ?? null,
        },
      },
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar sessão:", error)
    return NextResponse.json(
      { error: "Erro ao buscar sessão" },
      { status: 500 }
    )
  }
}

