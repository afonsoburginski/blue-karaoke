/**
 * Utilitários para handlers de API Route (Next.js App Router).
 *
 * Centraliza autenticação e guarda de admin, eliminando o padrão de buscar
 * o usuário do DB novamente só para verificar o role — o getCurrentUser() já
 * retorna o role diretamente da sessão (better-auth additionalFields).
 */
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

type ApiUser = Awaited<ReturnType<typeof getCurrentUser>>

/** Garante que há sessão válida. Retorna o usuário ou uma resposta 401. */
export async function requireAuth(): Promise<
  { user: NonNullable<ApiUser>; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    }
  }
  return { user }
}

/**
 * Garante que há sessão válida E que o usuário é admin.
 * O role vem direto da sessão — zero queries extras ao DB.
 */
export async function requireAdmin(): Promise<
  { user: NonNullable<ApiUser>; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result
  const { user } = result
  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      ),
    }
  }
  return { user }
}

/** Headers de cache recomendados para respostas privadas. */
export const CACHE = {
  /** Dados que mudam pouco (listas de admin). */
  SHORT: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  /** Dados estáticos por mais tempo. */
  MEDIUM: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  /** Sem cache (mutações, dados ultra-frescos). */
  NONE: { "Cache-Control": "no-store" },
} as const
