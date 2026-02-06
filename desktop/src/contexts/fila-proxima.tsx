import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface FilaItem {
  codigo: string
  titulo?: string
  artista?: string
}

interface FilaProximaContextType {
  fila: FilaItem[]
  addToFila: (item: FilaItem) => void
  removeFromFila: (codigo: string) => void
  nextInFila: () => FilaItem | null
  popFila: () => FilaItem | null
  clearFila: () => void
  filaLength: number
}

const FilaProximaContext = createContext<FilaProximaContextType | null>(null)

export function FilaProximaProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<FilaItem[]>(() => {
    try {
      const saved = localStorage.getItem("blue-karaoke-fila-proxima")
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const save = (items: FilaItem[]) => {
    localStorage.setItem("blue-karaoke-fila-proxima", JSON.stringify(items))
  }

  const addToFila = useCallback((item: FilaItem) => {
    setFila(prev => {
      const next = [...prev, item]
      save(next)
      return next
    })
  }, [])

  const removeFromFila = useCallback((codigo: string) => {
    setFila(prev => {
      const next = prev.filter(i => i.codigo !== codigo)
      save(next)
      return next
    })
  }, [])

  const nextInFila = useCallback((): FilaItem | null => {
    return fila.length > 0 ? fila[0] : null
  }, [fila])

  const popFila = useCallback((): FilaItem | null => {
    if (fila.length === 0) return null
    const [first, ...rest] = fila
    setFila(rest)
    save(rest)
    return first
  }, [fila])

  const clearFila = useCallback(() => {
    setFila([])
    save([])
  }, [])

  return (
    <FilaProximaContext.Provider value={{ fila, addToFila, removeFromFila, nextInFila, popFila, clearFila, filaLength: fila.length }}>
      {children}
    </FilaProximaContext.Provider>
  )
}

export function useFilaProxima() {
  const ctx = useContext(FilaProximaContext)
  if (!ctx) throw new Error("useFilaProxima must be used within FilaProximaProvider")
  return ctx
}
