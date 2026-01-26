"use client"

import { useQuery } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"

export interface DashboardStats {
  totalUsuarios: number
  totalMusicas: number
  totalGb: number
  receitaMensal: number
}

/**
 * Hook React Query para buscar estatísticas do dashboard
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente via queryClient.invalidateQueries()
 */
export function useDashboardStats(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {}

  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      return memoryCache.get("dashboard:stats", async () => {
        console.log('[useDashboardStats] 🔄 FETCHING from API')
        const res = await fetch("/api/estatisticas")
        if (!res.ok) {
          throw new Error("Falha ao carregar estatísticas do dashboard")
        }
        const data = await res.json()
        console.log('[useDashboardStats] ✅ API FETCH complete')
        return {
          totalUsuarios: data.stats.totalUsuarios || 0,
          totalMusicas: data.stats.totalMusicas || 0,
          totalGb: data.stats.totalGb || 0,
          receitaMensal: data.stats.receitaMensal || 0,
        }
      })
    },
    enabled,
  })
}


