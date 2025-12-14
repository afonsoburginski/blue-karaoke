 'use client'

import { useQuery } from '@tanstack/react-query'

export interface StorageUsage {
  totalBytes: number
  totalObjects: number
  totalGb: number
}

/**
 * Hook para buscar e cachear o uso do bucket R2.
 * - key: ["storage", "usage"]
 * - staleTime: 5 minutos (pode ser ajustado por chamada)
 */
export function useStorageUsage(options?: { enabled?: boolean; staleTime?: number }) {
  const { enabled = true, staleTime = 1000 * 60 * 5 } = options || {}

  const query = useQuery<StorageUsage>({
    queryKey: ["storage", "usage"],
    queryFn: async () => {
      const res = await fetch("/api/storage/usage")
      if (!res.ok) {
        throw new Error("Falha ao carregar uso do storage")
      }
      return res.json()
    },
    enabled,
    staleTime,
  })

  return query
}


