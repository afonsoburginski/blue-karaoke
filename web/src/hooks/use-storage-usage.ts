'use client'

import { useQuery } from '@tanstack/react-query'
import { memoryCache } from '@/lib/memory-cache'

export interface StorageUsage {
  totalBytes: number
  totalObjects: number
  totalGb: number
}

/**
 * Hook React Query para buscar uso do bucket R2
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente via queryClient.invalidateQueries()
 */
export function useStorageUsage(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {}

  return useQuery<StorageUsage>({
    queryKey: ["storage", "usage"],
    queryFn: async () => {
      return memoryCache.get("storage:usage", async () => {
        console.log('[useStorageUsage] 🔄 FETCHING from API')
        const res = await fetch("/api/storage/usage")
        if (!res.ok) {
          throw new Error("Falha ao carregar uso do storage")
        }
        const data = await res.json()
        console.log('[useStorageUsage] ✅ API FETCH complete')
        return data
      })
    },
    enabled,
  })
}


