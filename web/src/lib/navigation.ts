/**
 * Utilitário de navegação otimizado
 * Preloada rotas e usa startTransition para navegações não bloqueantes
 * Solução leve e rápida para melhorar performance de navegação no Next.js
 * 
 * Inspirado nas melhores práticas do TanStack Router:
 * - Prefetch automático
 * - Navegação não bloqueante com startTransition
 * - Cache de prefetch para evitar requisições duplicadas
 */

import { useRouter as useNextRouter } from "next/navigation"
import { startTransition, useCallback, useRef } from "react"

// Cache global de rotas prefetchadas (compartilhado entre instâncias)
const globalPrefetchedRoutes = new Set<string>()

/**
 * Hook otimizado para navegação rápida
 * - Preloada rotas automaticamente antes de navegar
 * - Usa startTransition para não bloquear UI
 * - Cache de prefetch para evitar requisições duplicadas
 * - Retorna função de navegação que funciona no primeiro clique
 * 
 * @example
 * ```tsx
 * const { navigate } = useNavigation()
 * navigate('/dashboard') // Prefetch + navegação otimizada
 * ```
 */
export function useNavigation() {
  const router = useNextRouter()
  const prefetchedRoutes = useRef<Set<string>>(new Set())

  const navigate = useCallback(
    (path: string, options?: { replace?: boolean; prefetch?: boolean }) => {
      const { replace = false, prefetch = true } = options || {}

      // Prefetch da rota se habilitado (melhora performance)
      // Cache global + local para evitar prefetch duplicado
      if (
        prefetch &&
        typeof window !== "undefined" &&
        !prefetchedRoutes.current.has(path) &&
        !globalPrefetchedRoutes.has(path)
      ) {
        try {
          router.prefetch(path)
          prefetchedRoutes.current.add(path)
          globalPrefetchedRoutes.add(path)
        } catch (error) {
          // Ignorar erros de prefetch (rota pode não existir ainda)
        }
      }

      // Usar startTransition para navegação não bloqueante
      // Isso garante que a UI não trave durante a navegação
      // Similar ao comportamento do TanStack Router
      startTransition(() => {
        try {
          if (replace) {
            router.replace(path)
          } else {
            router.push(path)
          }
        } catch (error) {
          console.error("Erro na navegação:", error)
        }
      })
    },
    [router]
  )

  return { navigate, router }
}

/**
 * Função helper para navegação rápida (sem hook)
 * Útil para navegações em callbacks ou fora de componentes
 * 
 * @example
 * ```tsx
 * const router = useRouter()
 * navigateFast(router, '/dashboard') // Prefetch + navegação otimizada
 * ```
 */
export function navigateFast(
  router: ReturnType<typeof useNextRouter>,
  path: string,
  options?: { replace?: boolean; prefetch?: boolean }
) {
  const { replace = false, prefetch = true } = options || {}

  // Prefetch imediato (se ainda não foi feito)
  if (prefetch && typeof window !== "undefined" && !globalPrefetchedRoutes.has(path)) {
    try {
      router.prefetch(path)
      globalPrefetchedRoutes.add(path)
    } catch (error) {
      // Ignorar erros de prefetch
    }
  }

  // Navegação com startTransition (não bloqueia UI)
  startTransition(() => {
    try {
      if (replace) {
        router.replace(path)
      } else {
        router.push(path)
      }
    } catch (error) {
      console.error("Erro na navegação:", error)
    }
  })
}
