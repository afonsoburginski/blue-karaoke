"use client"

import { useQuery } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"

export type TimeFilter = "week" | "month" | "year"

export interface TopMusic {
  rank: number
  codigo: string
  titulo: string
  artista: string
  reproducoes: number
}

/**
 * Hook React Query para buscar músicas mais tocadas
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente via queryClient.invalidateQueries()
 */
export function useTopMusics(period: TimeFilter, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {}

  return useQuery<TopMusic[]>({
    queryKey: ["dashboard", "topMusics", period],
    queryFn: async () => {
      return memoryCache.get(`dashboard:topMusics:${period}`, async () => {
        console.log(`[useTopMusics] 🔄 FETCHING from API - period: ${period}`)
        const res = await fetch(`/api/musicas/top?period=${period}`)
        if (!res.ok) {
          throw new Error("Falha ao carregar músicas mais tocadas")
        }
        const data = await res.json()
        console.log(`[useTopMusics] ✅ API FETCH complete - ${data.topMusics?.length || 0} músicas`)
        return (data.topMusics || []) as TopMusic[]
      })
    },
    enabled,
  })
}


