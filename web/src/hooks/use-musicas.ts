"use client"

import { useQuery } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"

export interface Musica {
  id: string
  codigo: string
  titulo: string
  artista: string
  duracao: number | null
  tamanho: number | null
  arquivo: string
  nomeArquivo?: string | null
  createdAt: string
  updatedAt: string
}

interface MusicasResponse {
  musicas: Musica[]
}

/**
 * Hook React Query para buscar músicas
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente via queryClient.invalidateQueries()
 */
export function useMusicas(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {}

  return useQuery<Musica[]>({
    queryKey: ["musicas"],
    queryFn: async () => {
      return memoryCache.get("musicas", async () => {
        console.log('[useMusicas] 🔄 FETCHING from API')
        const res = await fetch("/api/musicas")
        if (!res.ok) {
          throw new Error("Falha ao carregar músicas")
        }
        const data: MusicasResponse = await res.json()
        console.log(`[useMusicas] ✅ API FETCH complete - ${data.musicas?.length || 0} músicas`)
        return data.musicas || []
      })
    },
    enabled,
  })
}
