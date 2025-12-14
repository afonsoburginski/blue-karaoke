 'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Criar um QueryClient por cliente (evita compartilhar entre usuários)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minuto por padrão
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}


