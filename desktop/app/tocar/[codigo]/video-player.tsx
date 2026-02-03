"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useFilaProxima } from "@/contexts/fila-proxima"
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog"
import { UnifiedSearch } from "@/components/unified-search"
import { Settings } from "lucide-react"

interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

const HOLD_DURATION = 800 // 0.8 segundos para acionar (resposta rápida)

export default function VideoPlayer({ musica }: { musica: Musica }) {
  const router = useRouter()
  const { fila, addToFila, removeFromFila } = useFilaProxima()
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  /** true = indo para próxima música (não aplicar opacity-0 para evitar tela preta na transição) */
  const [transitionToNextSong, setTransitionToNextSong] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [openAtLogin, setOpenAtLoginState] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasFinishedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isElectron, setIsElectron] = useState(false)

  // Electron: detectar ambiente e carregar "Iniciar com Windows"
  useEffect(() => {
    if (typeof window === "undefined") return
    setIsElectron(!!(window as { electron?: { quit?: () => void } }).electron?.quit)
    if (!window.electron?.getOpenAtLogin) return
    window.electron.getOpenAtLogin().then(({ openAtLogin }) => setOpenAtLoginState(openAtLogin))
  }, [])
  const setOpenAtLogin = useCallback(async (value: boolean) => {
    if (typeof window === "undefined" || !window.electron?.setOpenAtLogin) return
    await window.electron.setOpenAtLogin!(value)
    setOpenAtLoginState(value)
  }, [])

  const handleVideoEnd = useCallback(async () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true

    // Saber de imediato se vamos para próxima música (evitar opacity-0 = tela preta na transição)
    const proximoCodigo = fila[0]
    const goingToNextSong = Boolean(proximoCodigo)
    setTransitionToNextSong(goingToNextSong)
    setIsExiting(true)

    try {
      // Salvar histórico (salva localmente primeiro, sincroniza depois)
      await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: musica.codigo,
        }),
      })
    } catch (error) {
      console.error("[v0] Error saving historico:", error)
    }

    // Gerar nota aleatória (entre 65 e 98 para parecer realista)
    const nota = Math.floor(Math.random() * 34) + 65

    // Sempre ir para a tela de nota; se tiver próxima na fila, passar no query para depois da contagem
    const delay = goingToNextSong ? 400 : 800
    await new Promise(resolve => setTimeout(resolve, delay))

    const notaUrl = proximoCodigo
      ? `/nota?nota=${nota}&proximo=${encodeURIComponent(proximoCodigo)}`
      : `/nota?nota=${nota}`
    router.push(notaUrl)
  }, [musica.codigo, router, fila])

  // Atualizar progresso do hold
  const updateHoldProgress = useCallback(() => {
    if (!holdStartRef.current) return

    const elapsed = Date.now() - holdStartRef.current
    const progress = Math.min(elapsed / HOLD_DURATION, 1)
    setHoldProgress(progress)

    if (progress >= 1) {
      // Completou o hold - finalizar
      handleVideoEnd()
    } else {
      // Continuar animando
      animationFrameRef.current = requestAnimationFrame(updateHoldProgress)
    }
  }, [handleVideoEnd])

  // Iniciar hold
  const startHold = useCallback(() => {
    if (hasFinishedRef.current || isExiting) return
    holdStartRef.current = Date.now()
    setIsHolding(true)
    setHoldProgress(0)
    animationFrameRef.current = requestAnimationFrame(updateHoldProgress)
  }, [updateHoldProgress, isExiting])

  // Cancelar hold
  const cancelHold = useCallback(() => {
    if (isExiting) return
    holdStartRef.current = null
    setIsHolding(false)
    setHoldProgress(0)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [isExiting])

  // Ao completar 5 dígitos (código): validar e adicionar à fila
  useEffect(() => {
    const codigo = searchQuery.replace(/\D/g, "")
    if (codigo.length !== 5) return
    let cancelled = false
    fetch(`/api/musica/${codigo}`)
      .then((r) => r.json())
      .then((data: { exists?: boolean; musica?: { titulo: string; artista?: string } }) => {
        if (cancelled) return
        if (data.exists) {
          addToFila(codigo)
          const titulo = data.musica?.titulo ?? "Música"
          toast.success(
            <div className="space-y-1 py-0.5">
              <p className="text-lg font-semibold leading-tight">{titulo}</p>
              <p className="text-base text-stone-600">para tocar como próxima</p>
            </div>,
            { duration: 4000, className: "min-w-[340px]" }
          )
        } else {
          toast.error("Código não encontrado")
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Erro ao verificar código")
      })
      .finally(() => {
        if (!cancelled) setSearchQuery("")
      })
    return () => {
      cancelled = true
    }
  }, [searchQuery, addToFila])

  // Listener de teclado: F12, Delete, +, C, P, Enter, Backspace, 0-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isSearchInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest("input") || target.closest("textarea") || target.isContentEditable
      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }
      // Delete = cancelar (usar e.code para pegar a tecla física; em alguns layouts e.key vira ",")
      if (e.code === "Delete" || e.key === "Delete") {
        e.preventDefault()
        const video = videoRef.current
        if (video) video.pause()
        router.push("/")
        return
      }
      // + = reiniciar música atual (só <video>; YouTube não dá para controlar)
      if (e.key === "+") {
        e.preventDefault()
        const video = videoRef.current
        if (video) {
          video.currentTime = 0
          video.play().catch(() => {})
        } else {
          router.push("/")
        }
        return
      }
      // C = tocar música aleatória (só baixadas)
      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        fetch("/api/musicas/aleatoria")
          .then((r) => r.json())
          .then((data: { codigo: string | null }) => {
            if (data.codigo) router.push(`/tocar/${data.codigo}`)
            else toast.info("Nenhuma música baixada. Pressione * para sincronizar.")
          })
          .catch(() => toast.error("Erro ao buscar música aleatória."))
        return
      }
      // P = pausar/retomar (só <video>)
      if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        const video = videoRef.current
        if (video) {
          if (video.paused) video.play().catch(() => {})
          else video.pause()
        }
        return
      }
      // Enter: com pesquisa ativa (barra visível) = escolher próxima música; senão = segurar para finalizar
      if (e.key === "Enter" && !e.repeat) {
        if (isSearchInput || searchQuery.length > 0) {
          // Foco pode estar na overlay; disparar submit da busca para escolher próxima
          if (searchQuery.length > 0) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent("tocar-search-submit"))
          }
          return
        }
        startHold()
        return
      }
      // Backspace / 0-9 / letras só atualizam o campo de busca quando o foco NÃO está no input (overlay)
      if (!isSearchInput) {
        if (!isExiting && e.key === "Backspace" && !e.repeat && searchQuery.length > 0) {
          e.preventDefault()
          setSearchQuery((prev) => prev.slice(0, -1))
          return
        }
        if (!isExiting && !e.repeat && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          setSearchQuery((prev) => prev + e.key)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isSearchInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest("input") || target.closest("textarea") || target.isContentEditable
      if (e.key === "Enter" && !isSearchInput) {
        cancelHold()
      }
    }

    // Captura: receber teclas antes do vídeo/iframe para Delete, Backspace, + etc. funcionarem
    document.addEventListener("keydown", handleKeyDown, { capture: true })
    document.addEventListener("keyup", handleKeyUp, { capture: true })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
      document.removeEventListener("keyup", handleKeyUp, { capture: true })
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [startHold, cancelHold, router, isExiting, searchQuery])

  const isYouTube = musica.arquivo.includes("youtube.com") || musica.arquivo.includes("youtu.be")
  const isRemoteUrl = musica.arquivo.startsWith("http://") || musica.arquivo.startsWith("https://")
  
  // Determinar URL do vídeo
  const videoSrc = isRemoteUrl 
    ? musica.arquivo 
    : `/api/video/${musica.codigo}`

  // Foco na overlay para as teclas (Delete, +, C, etc.) chegarem aqui em vez do vídeo/iframe
  useEffect(() => {
    overlayRef.current?.focus()
  }, [])

  return (
    <div 
      className={`fixed inset-0 z-0 w-screen h-screen overflow-hidden bg-black transition-all duration-700 ${
        isExiting && !transitionToNextSong ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{ maxWidth: '100vw', maxHeight: '100dvh' }}
    >
      {/* Logo no canto superior esquerdo */}
      <div className="absolute top-8 left-8 z-20">
        <div className="relative w-24 h-24 md:w-28 md:h-28">
          <Image
            src="/logo-white.png"
            alt="Blue Karaokê"
            fill
            className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
            priority
          />
        </div>
      </div>

      {/* Barra de ferramentas (atalhos): só aparece junto com o input de pesquisa */}
      {searchQuery.length > 0 && (
        <div className="absolute left-0 right-0 z-20 top-36 md:top-40 bg-stone-100/90 backdrop-blur-sm shadow-md py-3 px-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setConfigDialogOpen(true)}
            className="inline-flex items-center gap-2 text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Configurações (F12)"
          >
            <Settings className="h-5 w-5 opacity-70" aria-hidden />
            Configurações (F12)
          </button>
          <span className="text-stone-400 select-none">·</span>
          {isElectron && (
            <>
              <button
                type="button"
                onClick={() => (window as { electron?: { quit?: () => void } }).electron?.quit?.()}
                className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
                title="Fechar Programa (ESC)"
              >
                Fechar Programa (ESC)
              </button>
              <span className="text-stone-400 select-none">·</span>
              <button
                type="button"
                onClick={() => (window as { electron?: { minimize?: () => void } }).electron?.minimize?.()}
                className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
                title="Minimizar Programa (Espaço)"
              >
                Minimizar Programa (Espaço)
              </button>
              <span className="text-stone-400 select-none">·</span>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              fetch("/api/musicas/aleatoria")
                .then((r) => r.json())
                .then((data: { codigo: string | null }) => {
                  if (data.codigo) router.push(`/tocar/${data.codigo}`)
                  else toast.info("Nenhuma música baixada. Pressione * para sincronizar.")
                })
                .catch(() => toast.error("Erro ao buscar música aleatória."))
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Tocar música aleatória (C)"
          >
            Tocar música aleatória (C)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current
              if (video) {
                if (video.paused) video.play().catch(() => {})
                else video.pause()
              }
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Pausar música (P)"
          >
            Pausar música (P)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current
              if (video) {
                video.currentTime = 0
                video.play().catch(() => {})
              } else {
                router.push("/")
              }
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Reiniciar (+)"
          >
            Reiniciar (+)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current
              if (video) video.pause()
              router.push("/")
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Cancelar (Delete) — para a música e volta à tela inicial"
          >
            Cancelar (Delete)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => searchQuery.length > 0 && setSearchQuery((prev) => prev.slice(0, -1))}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Limpar último caractere (Backspace) — só quando estiver digitando"
          >
            Limpar (Backspace)
          </button>
        </div>
      )}

      {/* Barra de busca: só aparece quando estiver pesquisando (tem algo no campo); some ao esvaziar ou ao escolher a próxima */}
      {searchQuery.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 min-h-48 bg-stone-100/90 backdrop-blur-sm flex flex-col justify-center pl-8 pr-8 py-4 gap-3">
          <p className="text-stone-800 text-xl font-medium">
            Próxima música — digite o código ou busque por nome/artista
          </p>
          <UnifiedSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSelectCodigo={(codigo, info) => {
              addToFila(codigo)
              const titulo = info?.titulo ?? "Música"
              toast.success(
                <div className="space-y-1 py-0.5">
                  <p className="text-lg font-semibold leading-tight">{titulo}</p>
                  <p className="text-base text-stone-600">para tocar como próxima</p>
                </div>,
                { duration: 4000, className: "min-w-[340px]" }
              )
              setSearchQuery("")
            }}
          />
          <p className="text-stone-600 text-lg">
            O que você digita no teclado aparece aqui. Enter no resultado ou 5 dígitos adiciona à fila.
          </p>
        </div>
      )}

      {/* Video player */}
      <div className="absolute inset-0 overflow-hidden">
        {isYouTube ? (
          <iframe
            className="w-full h-full border-0"
            src={`${musica.arquivo}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Karaoke Video"
          />
        ) : (
          <video
            ref={videoRef}
            tabIndex={-1}
            className="w-full h-full object-contain bg-black"
            src={videoSrc}
            autoPlay
            muted={false}
            controls={false}
            playsInline
            loop={false}
            onEnded={handleVideoEnd}
          />
        )}
      </div>

      {/* Camada transparente: recebe foco para teclado (Delete, +, Backspace, etc.) funcionar */}
      <div
        ref={overlayRef}
        tabIndex={0}
        className="absolute inset-0 pointer-events-auto bg-transparent z-10 outline-none"
        aria-hidden
      />

      {/* Overlay de transição */}
      {isExiting && (
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-purple-900/80 via-black to-cyan-900/80 flex items-center justify-center z-30 animate-pulse">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white text-2xl font-semibold">Calculando sua pontuação...</p>
          </div>
        </div>
      )}

      {/* Indicador de hold no centro da tela */}
      {isHolding && !isExiting && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-4 bg-black/40 backdrop-blur-sm rounded-3xl p-8">
            {/* Círculo de progresso */}
            <div className="relative w-36 h-36">
              {/* Fundo do círculo */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progresso */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${holdProgress * 283} 283`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Porcentagem no centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-3xl font-bold drop-shadow-lg">
                  {Math.round(holdProgress * 100)}%
                </span>
              </div>
            </div>
            {/* Texto */}
            <p className="text-white text-xl font-semibold drop-shadow-lg">
              Finalizando...
            </p>
          </div>
        </div>
      )}

      {/* Instrução sutil no canto inferior */}
      {!isExiting && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white/40 text-lg">
              Segure <span className="text-cyan-400/60 font-mono">Enter</span> para finalizar
            </p>
          </div>
        </div>
      )}

      <ConfiguracoesDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        openAtLogin={openAtLogin}
        setOpenAtLogin={setOpenAtLogin}
      />
    </div>
  )
}
