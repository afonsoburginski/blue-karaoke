"use client"

/**
 * Componente de busca unificado para ASSINANTES (tipo "assinatura")
 * 
 * DIFERENCIAÇÃO:
 * - Assinantes (tipo "assinatura"): Podem buscar por código OU nome/artista
 * - Máquinas (tipo "maquina"): Usam apenas input de código na página principal
 * 
 * Este componente detecta automaticamente:
 * - Se digitar 5 dígitos numéricos: busca por código
 * - Se digitar texto: busca por nome do artista ou título da música
 */

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Search, Music, Loader2, Hash } from "lucide-react"
import { useRouter } from "next/navigation"

interface MusicaResult {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export interface UnifiedSearchProps {
  /** Quando informado, ao selecionar música chama isto em vez de navegar (ex.: tela de tocar = adicionar à fila). Pode receber info com titulo/artista para o toast. */
  onSelectCodigo?: (codigo: string, info?: { titulo: string; artista?: string }) => void
  /** Valor controlado (ex.: tela de tocar mostra o que está sendo digitado no teclado) */
  value?: string
  /** Chamado quando o valor do input muda (uso com value) */
  onChange?: (value: string) => void
}

export function UnifiedSearch({ onSelectCodigo, value, onChange }: UnifiedSearchProps = {}) {
  const [internalQuery, setInternalQuery] = useState("")
  const query = value !== undefined ? value : internalQuery
  const setQuery = (v: string | ((prev: string) => string)) => {
    const next = typeof v === "function" ? v(query) : v
    if (onChange) onChange(next)
    if (value === undefined) setInternalQuery(next)
  }
  const [resultados, setResultados] = useState<MusicaResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Ao abrir resultados ou mudar lista, selecionar o primeiro
  useEffect(() => {
    if (showResults && resultados.length > 0) {
      setSelectedIndex(0)
    }
  }, [showResults, resultados.length])

  // Detectar se é código (5 dígitos numéricos)
  useEffect(() => {
    const numericOnly = query.replace(/\D/g, "")
    const isNumericCode = numericOnly.length === 5 && /^\d{5}$/.test(numericOnly)
    setIsCode(isNumericCode)
  }, [query])

  useEffect(() => {
    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Se for código de 5 dígitos, buscar direto
    if (isCode) {
      setShowResults(false)
      return
    }

    // Se a query tiver menos de 2 caracteres, limpar resultados
    if (query.trim().length < 2) {
      setResultados([])
      setShowResults(false)
      return
    }

    // Debounce: aguardar 300ms após parar de digitar
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/musicas/buscar?q=${encodeURIComponent(query)}`)
        
        if (!response.ok) {
          throw new Error("Erro ao buscar músicas")
        }

        const data = await response.json()
        setResultados(data.resultados || [])
        setShowResults(true)
      } catch (error) {
        console.error("Erro ao buscar:", error)
        setResultados([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, isCode])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // Se for código: adicionar à fila (se onSelectCodigo) ou ir para tocar
    if (isCode) {
      const codigo = query.replace(/\D/g, "")
      setQuery("")
      if (onSelectCodigo) {
        onSelectCodigo(codigo)
      } else {
        router.push(`/tocar/${codigo}`)
      }
      return
    }

    // Se houver resultados, Enter inicia o selecionado (ou o primeiro)
    if (resultados.length > 0) {
      const idx = Math.min(selectedIndex, resultados.length - 1)
      const m = resultados[idx]
      handleSelectMusica(m.codigo, { titulo: m.titulo, artista: m.artista })
    }
  }

  const handleSelectMusica = (codigo: string, info?: { titulo: string; artista?: string }) => {
    setQuery("")
    setShowResults(false)
    if (onSelectCodigo) {
      onSelectCodigo(codigo, info)
    } else {
      router.push(`/tocar/${codigo}`)
    }
  }

  // Na tela de tocar: Enter na overlay dispara este evento; executar submit (escolher próxima música)
  useEffect(() => {
    if (!onSelectCodigo) return
    const onSubmitEvent = () => handleSubmit()
    window.addEventListener("tocar-search-submit", onSubmitEvent)
    return () => window.removeEventListener("tocar-search-submit", onSubmitEvent)
  }, [onSelectCodigo, query, isCode, resultados, selectedIndex])

  /** Só seleciona o índice (mostra dados na barra); Enter depois inicia */
  const handleSelectIndex = (index: number) => {
    setSelectedIndex(index)
  }

  const selectedMusica = resultados.length > 0 ? resultados[Math.min(selectedIndex, resultados.length - 1)] : null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
      return
    }
    if (!showResults || resultados.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
  }

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {isCode ? (
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cyan-600" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-600" />
          )}
          <Input
            type="text"
            placeholder={isCode ? "Código: Pressione Enter para buscar" : "Buscar nas músicas baixadas (código, nome ou artista)..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (resultados.length > 0 && !isCode) {
                setShowResults(true)
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowResults(false), 200)
            }}
            style={{ backgroundColor: "#fff" }}
            className={`pl-10 pr-10 h-14 !text-xl rounded-xl !bg-white text-stone-900 placeholder:text-stone-600 placeholder:text-xl border-2 border-stone-400 shadow-md focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:outline-none ${isCode ? "border-cyan-500 ring-2 ring-cyan-500/30" : ""}`}
          />
          {isLoading && !isCode && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-stone-600" />
          )}
        </div>
      </form>

      {/* Dados do item selecionado: portal para o CENTRO da barra (#search-selected-center) */}
      {typeof document !== "undefined" &&
        !isCode &&
        (() => {
          const el = document.getElementById("search-selected-center")
          if (!el) return null
          return createPortal(
            selectedMusica ? (
              <div className="w-full max-w-md text-stone-900 text-left text-2xl">
                <p className="text-xl font-medium text-stone-500 uppercase tracking-wide mb-2">Pressione Enter para iniciar</p>
                <div className="space-y-2 text-2xl">
                  <p><span className="font-medium text-stone-500">Título:</span> <span className="font-semibold text-stone-900 truncate block">{selectedMusica.titulo}</span></p>
                  <p><span className="font-medium text-stone-500">Artista:</span> <span className="text-stone-800 truncate block">{selectedMusica.artista}</span></p>
                  <p><span className="font-medium text-stone-500">Código:</span> <span className="font-mono font-bold text-cyan-700">{selectedMusica.codigo}</span></p>
                </div>
              </div>
            ) : null,
            el
          )
        })()}

      {/* Menu de opções: abre para cima para não sair da tela (input na barra inferior) */}
      {showResults && !isCode && resultados.length > 0 && (
        <div className="absolute z-50 left-0 right-0 bottom-full mb-2 rounded-xl bg-white border-2 border-stone-300 shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((musica, index) => (
            <button
              key={musica.codigo}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSelectIndex(index)
              }}
              className={`w-full text-left px-4 py-3 transition-colors border-b border-stone-200 last:border-0 ${
                index === selectedIndex ? "bg-cyan-50 border-l-4 border-l-cyan-500" : "hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Music className={`flex-shrink-0 h-5 w-5 ${index === selectedIndex ? "text-cyan-600" : "text-stone-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-lg text-stone-900 truncate">{musica.titulo}</p>
                  <p className="text-base text-stone-600 truncate">{musica.artista}</p>
                </div>
                <span className="font-mono text-base font-bold text-cyan-700 flex-shrink-0">{musica.codigo}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && !isCode && query.trim().length >= 2 && resultados.length === 0 && !isLoading && (
        <div className="absolute z-50 left-0 right-0 bottom-full mb-2 rounded-lg shadow-xl p-4 bg-white border-2 border-stone-200 text-stone-700 text-lg">
          <p className="text-stone-600 text-center text-lg">Nenhuma música encontrada</p>
        </div>
      )}
    </div>
  )
}
