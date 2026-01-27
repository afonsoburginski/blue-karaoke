'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// Padrão oficial do React Query v5 para Next.js App Router
// Ref: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Configurações de cache MUITO agressivas para navegação instantânea
        staleTime: Infinity, // Dados NUNCA ficam stale - sempre fresh
        gcTime: 1000 * 60 * 60 * 24, // 24 horas em cache antes de garbage collection
        refetchOnWindowFocus: false, // NUNCA refetch ao focar janela
        refetchOnReconnect: false, // NUNCA refetch ao reconectar
        refetchOnMount: false, // NUNCA refetch ao montar se há dados em cache
        retry: 1,
        retryDelay: 1000,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: sempre criar novo QueryClient
    return makeQueryClient()
  } else {
    // Browser: criar uma vez e reutilizar (singleton)
    // IMPORTANTE: usar variável de módulo, NÃO window
    // Isso evita problemas de hydration
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // IMPORTANTE: Usar useState com função de inicialização
  // Isso garante que o QueryClient seja criado UMA VEZ por renderização do Provider
  // e não seja recriado em re-renders do componente pai
  const [queryClient] = useState(() => getQueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}


