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

const CACHE_KEY = "musicas"

/**
 * Busca músicas: 1) cache em memória (sessão), 2) React Query (staleTime infinito).
 * Invalidar com memoryCache.invalidatePrefix("musicas") + queryClient.invalidateQueries({ queryKey: ["musicas"] }).
 */
export function useMusicas(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {}

  return useQuery<Musica[]>({
    queryKey: ["musicas"],
    queryFn: async () => {
      return memoryCache.get(CACHE_KEY, async () => {
        const res = await fetch("/api/musicas?limit=1000", {
          cache: "no-store",
          credentials: "include",
        })
        if (!res.ok) throw new Error("Falha ao carregar músicas")
        const data = await res.json()
        const list = data.musicas ?? []
        return list.map((m: Musica) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : (m.createdAt as Date)?.toISOString?.() ?? "",
          updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : (m.updatedAt as Date)?.toISOString?.() ?? "",
        }))
      })
    },
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24h
  })
}
