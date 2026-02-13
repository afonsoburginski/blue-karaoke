"use client"

import { useQuery } from "@tanstack/react-query"
import type { DashboardPayload } from "@/lib/dashboard-data"

const STALE_MS = 30 * 1000

export interface DashboardUser {
  id: string
  name: string
  email: string
  slug: string
  role: string
}

export type DashboardDataResponse = DashboardPayload & {
  user: DashboardUser
}

/**
 * Uma requisição: user + stats + topMusics + storage + novosUsuarios.
 * Na página do dashboard não precisa useAuth(); user vem na resposta.
 */
export function useDashboardData(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {}

  return useQuery<DashboardDataResponse>({
    queryKey: ["dashboard", "data"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) throw new Error("Não autenticado")
        if (res.status === 403) throw new Error("Acesso negado")
        throw new Error("Falha ao carregar dashboard")
      }
      return res.json()
    },
    enabled,
    staleTime: STALE_MS,
    gcTime: 1000 * 60 * 60,
    retry: false,
  })
}
