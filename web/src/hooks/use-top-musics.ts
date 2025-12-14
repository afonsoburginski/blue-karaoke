"use client"

import { useQuery } from "@tanstack/react-query"

export type TimeFilter = "week" | "month" | "year"

export interface TopMusic {
  rank: number
  codigo: string
  titulo: string
  artista: string
  reproducoes: number
}

export function useTopMusics(period: TimeFilter, options?: { enabled?: boolean; staleTime?: number }) {
  const { enabled = true, staleTime = 1000 * 60 } = options || {}

  return useQuery<TopMusic[]>({
    queryKey: ["dashboard", "topMusics", period],
    queryFn: async () => {
      const res = await fetch(`/api/musicas/top?period=${period}`)
      if (!res.ok) {
        throw new Error("Falha ao carregar músicas mais tocadas")
      }
      const data = await res.json()
      return (data.topMusics || []) as TopMusic[]
    },
    enabled,
    staleTime,
  })
}


