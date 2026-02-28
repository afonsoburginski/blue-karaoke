import { useState, useEffect, useCallback } from "react"
import { ATALHOS } from "@/lib/atalhos"

const STORAGE_KEY = "blue-karaoke-atalhos"
export const ATALHOS_CHANGE_EVENT = "blue-karaoke-atalhos-changed"

/** Mapa de id → tecla atual (somente as customizadas; ausentes = padrão). */
export type AtalhosMap = Record<string, string>

function loadFromStorage(): AtalhosMap {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? (JSON.parse(s) as AtalhosMap) : {}
  } catch {
    return {}
  }
}

function saveToStorage(map: AtalhosMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent(ATALHOS_CHANGE_EVENT))
}

/**
 * Hook de atalhos personalizáveis.
 * Lê/grava em localStorage e sincroniza entre componentes via evento customizado.
 * Qualquer instância do hook recebe atualizações em tempo real quando os atalhos mudam.
 */
export function useAtalhos() {
  const [saved, setSaved] = useState<AtalhosMap>(loadFromStorage)

  // Sincroniza quando outro componente altera os atalhos (ex.: dialog de config)
  useEffect(() => {
    const handler = () => setSaved(loadFromStorage())
    window.addEventListener(ATALHOS_CHANGE_EVENT, handler)
    return () => window.removeEventListener(ATALHOS_CHANGE_EVENT, handler)
  }, [])

  /**
   * Retorna a tecla atual para o atalho `id`.
   * Usa o valor salvo pelo usuário; se ausente, retorna o padrão.
   */
  const getKey = useCallback(
    (id: string): string => {
      if (id in saved) return saved[id]
      const def = ATALHOS.find((a) => a.id === id)
      return def?.teclaDefault ?? ""
    },
    [saved],
  )

  /** Define uma nova tecla para um atalho e persiste. */
  const setKey = useCallback((id: string, key: string) => {
    setSaved((prev) => {
      const updated = { ...prev, [id]: key }
      saveToStorage(updated)
      return updated
    })
  }, [])

  /** Remove a customização de um atalho (volta ao padrão). */
  const resetKey = useCallback((id: string) => {
    setSaved((prev) => {
      const updated = { ...prev }
      delete updated[id]
      saveToStorage(updated)
      return updated
    })
  }, [])

  /** Reseta todos os atalhos para os valores padrão. */
  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(ATALHOS_CHANGE_EVENT))
    setSaved({})
  }, [])

  /** Retorna true se o atalho foi customizado pelo usuário. */
  const isCustom = useCallback((id: string): boolean => id in saved, [saved])

  /**
   * Detecta conflito: verifica se outro atalho configurável usa a mesma tecla.
   * Retorna o nome da ação conflitante ou null se não houver conflito.
   */
  const getConflito = useCallback(
    (id: string): string | null => {
      const minhaKey = getKey(id).toLowerCase()
      if (!minhaKey) return null
      for (const a of ATALHOS) {
        if (a.id === id || a.fixo) continue
        if (getKey(a.id).toLowerCase() === minhaKey) return a.acao
      }
      return null
    },
    [getKey],
  )

  return { getKey, setKey, resetKey, resetAll, isCustom, getConflito, saved }
}
