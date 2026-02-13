/**
 * Componente de busca unificado para ASSINANTES
 * 
 * Detecta automaticamente:
 * - Se digitar 5 dígitos numéricos: busca por código
 * - Se digitar texto: busca por nome do artista ou título da música
 */

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Search, Music, Loader2, Hash } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { buscarMusicas, getMusicaByCodigo, type MusicaSimple } from "@/lib/tauri"

export interface UnifiedSearchProps {
  onSelectCodigo?: (codigo: string, info?: { titulo: string; artista?: string }) => void
  value?: string
  onChange?: (value: string) => void
  autoFocus?: boolean
  /** "maquina" = só código numérico (input numérico, 5 dígitos); "assinatura" = busca por texto ou código */
  tipoChave?: string
  /** Ref para o input (ex.: para focar automaticamente em modo máquina sem mouse) */
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function UnifiedSearch({ onSelectCodigo, value, onChange, autoFocus, tipoChave, inputRef: inputRefProp }: UnifiedSearchProps = {}) {
  const isModoMaquina = tipoChave === "maquina"
  const inputRef = useRef<HTMLInputElement>(null)
  const setInputRef = (el: HTMLInputElement | null) => {
    ;(inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
    if (inputRefProp) (inputRefProp as React.MutableRefObject<HTMLInputElement | null>).current = el
  }
  const [internalQuery, setInternalQuery] = useState("")
  const query = value !== undefined ? value : internalQuery
  const setQuery = (v: string | ((prev: string) => string)) => {
    let next = typeof v === "function" ? v(query) : v
    if (isModoMaquina) next = next.replace(/\D/g, "").slice(0, 5)
    if (onChange) onChange(next)
    if (value === undefined) setInternalQuery(next)
  }
  const [resultados, setResultados] = useState<MusicaSimple[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  /** No modo máquina: detalhes da música ao digitar 5 dígitos (para mostrar no portal) */
  const [previewMusicaMaquina, setPreviewMusicaMaquina] = useState<MusicaSimple | null>(null)
  const [isLoadingCodigo, setIsLoadingCodigo] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // Ao abrir resultados ou mudar lista, selecionar o primeiro
  useEffect(() => {
    if (showResults && resultados.length > 0) {
      setSelectedIndex(0)
    }
  }, [showResults, resultados.length])

  // Detectar se é código (4 ou 5 dígitos numéricos; 1009 e 01009 ambos válidos)
  useEffect(() => {
    const numericOnly = query.replace(/\D/g, "")
    const isNumericCode = (numericOnly.length === 4 || numericOnly.length === 5) && /^\d{4,5}$/.test(numericOnly)
    setIsCode(isNumericCode)
  }, [query])

  // Modo máquina: ao digitar 4 ou 5 dígitos, buscar música (normalizar com zero à esquerda: 1009 → 01009)
  useEffect(() => {
    if (!isModoMaquina) {
      setPreviewMusicaMaquina(null)
      setIsLoadingCodigo(false)
      return
    }
    const codigo = query.replace(/\D/g, "")
    if (codigo.length < 4 || codigo.length > 5) {
      setPreviewMusicaMaquina(null)
      setIsLoadingCodigo(false)
      return
    }
    const codigoNormalizado = codigo.padStart(5, "0")
    let cancelled = false
    setIsLoadingCodigo(true)
    getMusicaByCodigo(codigoNormalizado)
      .then((musica) => {
        if (!cancelled) {
          setPreviewMusicaMaquina(musica ?? null)
          setIsLoadingCodigo(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewMusicaMaquina(null)
          setIsLoadingCodigo(false)
        }
      })
    return () => { cancelled = true }
  }, [isModoMaquina, query])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (isCode || isModoMaquina) {
      setShowResults(false)
      if (isModoMaquina) return
    }

    if (query.trim().length < 2) {
      setResultados([])
      setShowResults(false)
      return
    }

    // Debounce: aguardar 300ms após parar de digitar
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await buscarMusicas(query)
        setResultados(results)
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
  }, [query, isCode, isModoMaquina])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (isCode) {
      const codigo = query.replace(/\D/g, "")
      const codigoNormalizado = codigo.padStart(5, "0")
      if (/^0+$/.test(codigoNormalizado)) {
        return
      }
      setQuery("")
      if (onSelectCodigo) {
        onSelectCodigo(codigoNormalizado)
      } else {
        navigate(`/tocar?c=${encodeURIComponent(codigoNormalizado)}`)
      }
      return
    }

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
      navigate(`/tocar?c=${encodeURIComponent(codigo)}`)
    }
  }

  // Na tela de tocar: Enter na overlay dispara este evento
  useEffect(() => {
    if (!onSelectCodigo) return
    const onSubmitEvent = () => handleSubmit()
    window.addEventListener("tocar-search-submit", onSubmitEvent)
    return () => window.removeEventListener("tocar-search-submit", onSubmitEvent)
  }, [onSelectCodigo, query, isCode, resultados, selectedIndex])

  const handleSelectIndex = (index: number) => {
    setSelectedIndex(index)
  }

  const selectedMusica = resultados.length > 0 ? resultados[Math.min(selectedIndex, resultados.length - 1)] : null
  /** Música a exibir no portal: resultado da busca (assinatura) ou preview por código (máquina) */
  const musicaDetalhe = isModoMaquina ? previewMusicaMaquina : selectedMusica

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Delete / NumpadDecimal: limpar busca
    if (e.key === "Delete" || e.code === "NumpadDecimal") {
      e.preventDefault()
      e.stopPropagation()
      setQuery("")
      setResultados([])
      setShowResults(false)
      setPreviewMusicaMaquina(null)
      setIsLoadingCodigo(false)
      return
    }
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
          {isCode || isModoMaquina ? (
            <Hash className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 ${isModoMaquina ? "h-8 w-8" : "h-5 w-5"}`} />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
          )}
          <Input
            ref={setInputRef}
            type={isModoMaquina ? "text" : "text"}
            inputMode={isModoMaquina ? "numeric" : "search"}
            pattern={isModoMaquina ? "[0-9]*" : undefined}
            autoFocus={autoFocus}
            placeholder={isModoMaquina ? "Digite o código (5 números)" : isCode ? "Código: Pressione Enter para buscar" : "Buscar nas músicas baixadas (código, nome ou artista)..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (resultados.length > 0 && !isCode) {
                setShowResults(true)
              }
            }}
            onBlur={() => {
              // Re-focar automaticamente para manter o input ativo (modo máquina sem mouse)
              setTimeout(() => {
                setShowResults(false)
                if (autoFocus && inputRef.current) {
                  inputRef.current.focus()
                }
              }, 200)
            }}
            className={
              isModoMaquina
                ? "pl-14 pr-14 h-24 min-h-24 !text-4xl font-semibold rounded-2xl bg-white/10 text-white placeholder:text-white/90 placeholder:text-4xl border-4 border-cyan-400 ring-4 ring-cyan-500/30 shadow-lg focus-visible:border-cyan-400 focus-visible:ring-4 focus-visible:ring-cyan-500/40 focus-visible:outline-none"
                : `pl-10 pr-10 h-14 !text-xl rounded-xl bg-white/10 text-white placeholder:text-white/90 placeholder:text-xl border-2 border-white/30 shadow-md focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:outline-none ${isCode ? "border-cyan-400 ring-2 ring-cyan-500/30" : ""}`
            }
          />
          {isLoading && !isCode && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-white/70" />
          )}
        </div>
      </form>

      {/* Dados do item selecionado / detalhes da música: portal para o CENTRO da barra (assinatura e máquina) */}
      {(() => {
        const el = document.getElementById("search-selected-center")
        if (!el) return null
        if (!musicaDetalhe && !isModoMaquina) return null
        if (isCode && !isModoMaquina) return null
        return createPortal(
          musicaDetalhe ? (
            <div className={`w-full max-w-md text-white text-left ${isModoMaquina ? "text-3xl md:text-4xl" : "text-2xl"}`}>
              <p className={`font-medium text-white/80 uppercase tracking-wide mb-2 ${isModoMaquina ? "text-2xl md:text-3xl" : "text-xl"}`}>Pressione Enter para iniciar</p>
              <div className={`space-y-1.5 ${isModoMaquina ? "text-3xl md:text-4xl" : "text-2xl"}`}>
                <p className="truncate"><span className="font-medium text-white/80">Título: </span><span className="font-semibold text-white">{musicaDetalhe.titulo}</span></p>
                <p className="truncate"><span className="font-medium text-white/80">Artista: </span><span className="text-white">{musicaDetalhe.artista}</span></p>
                <p className="truncate"><span className="font-medium text-white/80">Código: </span><span className="font-mono font-bold text-cyan-300">{musicaDetalhe.codigo}</span></p>
              </div>
            </div>
          ) : isModoMaquina && /^\d{4,5}$/.test(query.replace(/\D/g, "")) ? (
            <div className={`w-full max-w-md text-white text-left ${isModoMaquina ? "text-2xl md:text-3xl" : "text-2xl"}`}>
              {isLoadingCodigo ? (
                <p className="text-white/80">Buscando...</p>
              ) : (
                <p className="text-amber-300/90">Código não encontrado</p>
              )}
            </div>
          ) : null,
          el
        )
      })()}

      {/* Menu de opções: abre para cima */}
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
