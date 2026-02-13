import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getDashboardData } from "@/lib/dashboard-data"

const CACHE_SECONDS = 30
const STALE_WHILE_REVALIDATE = 60

function getCachedDashboard(userId: string) {
  return unstable_cache(
    () => getDashboardData({ userId, role: "admin" }),
    ["dashboard", userId],
    { revalidate: CACHE_SECONDS }
  )()
}

/**
 * Uma requisição: user + stats + topMusics + storage + novosUsuarios.
 * Cliente do dashboard não precisa chamar get-session-with-role.
 * Cache 30s no servidor para segundo acesso instantâneo.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const data = await getCachedDashboard(currentUser.userId)

    const payload = {
      user: {
        id: currentUser.userId,
        name: currentUser.name,
        email: currentUser.email,
        slug: currentUser.slug,
        role: currentUser.role,
      },
      ...data,
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error)
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    )
  }
}
