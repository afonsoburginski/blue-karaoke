"use client"

import { useQuery } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"

export interface Usuario {
  id: string
  slug: string
  name: string
  email: string
  avatar?: string | null
  role: string
  userType: string
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  assinatura: {
    id: string
    plano: string
    status: string
    dataInicio: Date | string | null
    dataFim: Date | string | null
    valor: number
    renovacaoAutomatica: boolean
  } | null
  chaveAtivacao: {
    id: string
    chave: string
    tipo: string
    status: string
    dataExpiracao: Date | string | null
    usadoEm: Date | string | null
    ultimoUso: Date | string | null
    limiteTempo?: number | null
  } | null
  diasRestantes: number | null
  dataAtivacao: Date | string | null
}

interface UseAdminUsuariosParams {
  tipo?: "subscriber" | "machine" | "all"
  status?: "active" | "inactive" | "all"
  enabled?: boolean
}

/**
 * Hook React Query para buscar usuários admin
 * Cache configurado globalmente no QueryClient:
 * - staleTime: Infinity (nunca marca como stale)
 * - gcTime: 24h (mantém em cache por 24h)
 * - refetchOnMount: false (não refaz fetch ao remontar)
 * - refetchOnWindowFocus: false (não refaz fetch ao focar janela)
 *
 * Resultado: dados são buscados UMA VEZ e reutilizados em todas navegações
 * até serem invalidados manualmente via queryClient.invalidateQueries()
 */
export function useAdminUsuarios(params?: UseAdminUsuariosParams) {
  const { tipo = "all", status = "all", enabled = true } = params || {}

  const cacheKey = `admin:usuarios:${tipo}:${status}`

  return useQuery<Usuario[]>({
    queryKey: ["admin", "usuarios", tipo, status],
    queryFn: async () => {
      // Usar cache em memória - dados persistem durante toda a sessão
      return memoryCache.get(cacheKey, async () => {
        console.log(`[useAdminUsuarios] 🔄 FETCHING from API - tipo: ${tipo}, status: ${status}`)
        const searchParams = new URLSearchParams()
        if (tipo !== "all") searchParams.append("tipo", tipo)
        if (status !== "all") searchParams.append("status", status)

        const res = await fetch(`/api/admin/usuarios?${searchParams.toString()}`)
        if (!res.ok) {
          throw new Error("Falha ao carregar usuários")
        }
        const data = await res.json()
        console.log(`[useAdminUsuarios] ✅ API FETCH complete - ${data.usuarios?.length || 0} users`)
        return data.usuarios || []
      })
    },
    enabled,
  })
}
