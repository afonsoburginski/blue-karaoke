/**
 * Sistema de Cache em Memória Global
 *
 * Cache PURO em memória que persiste durante toda a sessão do navegador.
 * Dados são carregados UMA VEZ e reutilizados em todas navegações.
 * Para revalidar: F5 (refresh da página).
 *
 * Benefícios:
 * - Navegação INSTANTÂNEA (dados já estão em memória)
 * - Zero requisições HTTP desnecessárias
 * - Simples e previsível
 */

type CacheEntry<T> = {
  data: T
  timestamp: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>
  private listeners: Map<string, Set<() => void>>

  constructor() {
    this.cache = new Map()
    this.listeners = new Map()
  }

  /**
   * Busca dados do cache. Se não existir, executa fetcher e armazena.
   */
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)

    if (cached) {
      console.log(`[MemoryCache] ✅ Cache HIT: ${key}`)
      return cached.data as T
    }

    console.log(`[MemoryCache] ❌ Cache MISS: ${key} - Fetching...`)
    const data = await fetcher()

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    console.log(`[MemoryCache] 💾 Cached: ${key}`)
    this.notifyListeners(key)

    return data
  }

  /**
   * Retorna dados do cache se existir, sem fazer fetch
   */
  peek<T>(key: string): T | undefined {
    const cached = this.cache.get(key)
    return cached?.data as T | undefined
  }

  /**
   * Invalida cache de uma key específica
   */
  invalidate(key: string) {
    console.log(`[MemoryCache] 🗑️ Invalidating: ${key}`)
    this.cache.delete(key)
    this.notifyListeners(key)
  }

  /**
   * Invalida cache que começa com o prefixo
   */
  invalidatePrefix(prefix: string) {
    console.log(`[MemoryCache] 🗑️ Invalidating prefix: ${prefix}`)
    const keys = Array.from(this.cache.keys()).filter(k => k.startsWith(prefix))
    keys.forEach(key => {
      this.cache.delete(key)
      this.notifyListeners(key)
    })
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    console.log(`[MemoryCache] 🗑️ Clearing all cache`)
    this.cache.clear()
    this.listeners.forEach((listeners, key) => {
      listeners.forEach(listener => listener())
    })
  }

  /**
   * Inscrever listener para mudanças em uma key
   */
  subscribe(key: string, listener: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)

    // Retorna função de unsubscribe
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }

  private notifyListeners(key: string) {
    this.listeners.get(key)?.forEach(listener => listener())
  }

  /**
   * Retorna estatísticas do cache
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Singleton global - persiste durante toda a sessão do navegador
export const memoryCache = new MemoryCache()

// Expor no window para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).__MEMORY_CACHE__ = memoryCache
}
