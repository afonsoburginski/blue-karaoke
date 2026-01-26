"use client"

import { useQuery } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"

export interface HistoryEntry {
  id: string
  musicaId: string
  codigo: string
  dataExecucao: string
  musica: {
    id: string
    titulo: string
    artista: string
    duracao: number | null
  } | null
}

export interface MostPlayed {
  musicaId: string
  codigo: string
  vezesTocada: number
  titulo: string
  artista: string
  duracao: number | null
}

interface HistoricoResponse {
  historico: HistoryEntry[]
  maisTocadas: MostPlayed[]
}

/**
 * Hook React Query para buscar histórico
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente (ex: via realtime) com queryClient.invalidateQueries()
 */
export function useHistorico(
  filter: "today" | "week" | "month" | "all" = "all",
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {}

  const cacheKey = `historico:${filter}`

  return useQuery<HistoricoResponse>({
    queryKey: ["historico", filter],
    queryFn: async () => {
      // Usar cache em memória - dados persistem durante toda a sessão
      return memoryCache.get(cacheKey, async () => {
        console.log(`[useHistorico] 🔄 FETCHING from API - filter: ${filter}`)
        const res = await fetch(`/api/historico?filter=${filter}&limit=100`)
        if (!res.ok) {
          throw new Error("Falha ao carregar histórico")
        }
        const data = await res.json()
        console.log(`[useHistorico] ✅ API FETCH complete - ${data.historico?.length || 0} items`)
        return {
          historico: data.historico || [],
          maisTocadas: data.maisTocadas || [],
        }
      })
    },
    enabled,
  })
}
