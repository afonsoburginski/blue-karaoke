"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

const STORAGE_KEY = "blue-karaoke-fila-proxima"

type FilaProximaContextValue = {
  fila: string[]
  addToFila: (codigo: string) => void
  removeFromFila: () => string | undefined
  clearFila: () => void
}

const FilaProximaContext = createContext<FilaProximaContextValue | null>(null)

function loadFila(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveFila(fila: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fila))
  } catch {
    // ignore
  }
}

export function FilaProximaProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<string[]>([])

  useEffect(() => {
    setFila(loadFila())
  }, [])

  const addToFila = useCallback((codigo: string) => {
    const trimmed = String(codigo).trim()
    if (!trimmed) return
    setFila((prev) => {
      const next = [...prev, trimmed]
      saveFila(next)
      return next
    })
  }, [])

  const removeFromFila = useCallback(() => {
    let removed: string | undefined
    setFila((prev) => {
      if (prev.length === 0) return prev
      const [first, ...rest] = prev
      removed = first
      saveFila(rest)
      return rest
    })
    return removed
  }, [])

  const clearFila = useCallback(() => {
    setFila([])
    saveFila([])
  }, [])

  const value: FilaProximaContextValue = {
    fila,
    addToFila,
    removeFromFila,
    clearFila,
  }

  return (
    <FilaProximaContext.Provider value={value}>
      {children}
    </FilaProximaContext.Provider>
  )
}

export function useFilaProxima() {
  const ctx = useContext(FilaProximaContext)
  if (!ctx) {
    return {
      fila: [] as string[],
      addToFila: (_: string) => {},
      removeFromFila: () => undefined as string | undefined,
      clearFila: () => {},
    }
  }
  return ctx
}
