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
import { Input } from "@/components/ui/input"
import { Search, Music, Loader2, Hash } from "lucide-react"
import { useRouter } from "next/navigation"

interface MusicaResult {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export function UnifiedSearch() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<MusicaResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

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

    // Se for código, buscar direto
    if (isCode) {
      const codigo = query.replace(/\D/g, "")
      router.push(`/tocar/${codigo}`)
      setQuery("")
      return
    }

    // Se tiver apenas um resultado, selecionar automaticamente
    if (resultados.length === 1) {
      handleSelectMusica(resultados[0].codigo)
    }
  }

  const handleSelectMusica = (codigo: string) => {
    setQuery("")
    setShowResults(false)
    router.push(`/tocar/${codigo}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {isCode ? (
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cyan-400" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
          )}
          <Input
            type="text"
            placeholder={isCode ? "Código: Pressione Enter para buscar" : "Buscar por código, nome ou artista..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              if (resultados.length > 0 && !isCode) {
                setShowResults(true)
              }
            }}
            onBlur={() => {
              // Delay para permitir clique nos resultados
              setTimeout(() => setShowResults(false), 200)
            }}
            className={`pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/50 ${
              isCode ? "border-cyan-400/50" : ""
            }`}
          />
          {isLoading && !isCode && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40 animate-spin" />
          )}
        </div>
      </form>

      {/* Resultados da busca (apenas para busca por texto) */}
      {showResults && !isCode && resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          {resultados.map((musica) => (
            <button
              key={musica.codigo}
              type="button"
              onClick={() => handleSelectMusica(musica.codigo)}
              className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{musica.titulo}</p>
                  <p className="text-white/60 text-sm truncate">{musica.artista}</p>
                </div>
                <span className="text-cyan-400 font-mono text-sm flex-shrink-0">
                  {musica.codigo}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && !isCode && query.trim().length >= 2 && resultados.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl p-4">
          <p className="text-white/60 text-center">Nenhuma música encontrada</p>
        </div>
      )}
    </div>
  )
}
