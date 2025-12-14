"use client"

import { useQuery } from "@tanstack/react-query"

export interface DashboardStats {
  totalUsuarios: number
  totalMusicas: number
  totalGb: number
  receitaMensal: number
}

export function useDashboardStats(options?: { enabled?: boolean; staleTime?: number }) {
  const { enabled = true, staleTime = 1000 * 60 } = options || {}

  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/estatisticas")
      if (!res.ok) {
        throw new Error("Falha ao carregar estatísticas do dashboard")
      }
      const data = await res.json()
      return {
        totalUsuarios: data.stats.totalUsuarios || 0,
        totalMusicas: data.stats.totalMusicas || 0,
        totalGb: data.stats.totalGb || 0,
        receitaMensal: data.stats.receitaMensal || 0,
      }
    },
    enabled,
    staleTime,
  })
}


