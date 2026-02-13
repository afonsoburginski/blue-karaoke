"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

const QUERY_KEY = ["auth", "session"] as const
const STALE_MS = 60 * 1000 // 1 min – alinhado ao Cache-Control da API

interface SessionUser {
  id: string
  name?: string | null
  email: string
  image?: string | null
  role?: string | null
  slug?: string | null
}

interface User {
  id: string
  slug: string
  name: string
  email: string
  avatar?: string | null
  role: string
}

async function fetchSessionWithRole(): Promise<{ session: { user: SessionUser } } | null> {
  const res = await fetch("/api/auth/get-session-with-role", {
    credentials: "include",
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error("Falha ao carregar sessão")
  return res.json()
}

/**
 * Uma única fonte de sessão: GET /api/auth/get-session-with-role.
 * Evita useSession + get-session-with-role (2 requests). Cache no cliente (React Query) + Cache-Control na API.
 */
export function useAuth() {
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSessionWithRole,
    staleTime: STALE_MS,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const sessionUser = data?.session?.user
  const user: User | null = sessionUser
    ? {
        id: sessionUser.id,
        slug: sessionUser.slug ?? createSlug(sessionUser.name || sessionUser.email.split("@")[0]),
        name: sessionUser.name ?? "",
        email: sessionUser.email,
        avatar: sessionUser.image ?? null,
        role: sessionUser.role ?? "user",
      }
    : null

  const refetchSession = async () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    await refetch()
  }

  return {
    user,
    isLoading: isLoading && !data,
    isRoleLoading: false,
    refetch: refetchSession,
  }
}

/** Invalida a sessão em cache (chamar após signOut). */
export function invalidateSessionQuery(queryClient: { invalidateQueries: (opts: { queryKey: readonly string[] }) => void }) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY })
}
