import { useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { useFilaProxima } from "@/contexts/fila-proxima"
import { useAtivacao } from "@/hooks/use-ativacao"
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog"
import { UnifiedSearch } from "@/components/unified-search"
import { Settings } from "lucide-react"
import {
  salvarHistorico,
  musicaAleatoria,
  getMusicaByCodigo,
  nativePlayerAvailable,
  playNative,
  stopNative,
  nativePlayerEnded,
  type MusicaSimple,
} from "@/lib/tauri"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { convertFileSrc } from "@tauri-apps/api/core"

const HOLD_DURATION = 800

export default function VideoPlayer({ musica }: { musica: MusicaSimple }) {
  const navigate = useNavigate()
  const { fila, addToFila } = useFilaProxima()
  const { status: ativacaoStatus } = useAtivacao()
  const isModoMaquina = ativacaoStatus.tipo === "maquina"

  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [transitionToNextSong, setTransitionToNextSong] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Paths: rawPath para mpv nativo, videoSrc para <video> HTML5 (fallback)
  const [rawPath, setRawPath] = useState<string | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  // Player nativo (mpv): undefined = detectando, true = disponível, false = usar <video>
  const [useNativePlayer, setUseNativePlayer] = useState<boolean | undefined>(undefined)
  const nativeStartedRef = useRef(false)

  const holdStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasFinishedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Normalização do caminho ---
  useEffect(() => {
    let path = musica.arquivo?.trim() ?? ""
    if (path.startsWith("\\\\?\\")) path = path.slice(4)
    if (!path) {
      console.error("[VideoPlayer] Música sem caminho no banco:", musica.codigo)
      navigate("/?notfound=1", { replace: true })
      return
    }
    setRawPath(path) // para mpv: pode ter backslashes, sem \\?\
    const normalized = path.replace(/\\/g, "/")
    setVideoSrc(convertFileSrc(normalized)) // para <video>: forward slashes
  }, [musica.codigo, musica.arquivo, navigate])

  // --- Detectar disponibilidade do player nativo ---
  useEffect(() => {
    nativePlayerAvailable()
      .then(setUseNativePlayer)
      .catch(() => setUseNativePlayer(false))
  }, [])

  // --- Fim do vídeo ---
  const handleVideoEnd = useCallback(async () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true

    // Parar player nativo se estava em uso
    if (useNativePlayer) {
      stopNative().catch(() => {})
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    const proximoItem = fila[0]
    const proximoCodigo = proximoItem?.codigo
    const goingToNextSong = Boolean(proximoCodigo)
    setTransitionToNextSong(goingToNextSong)
    setIsExiting(true)

    try {
      await salvarHistorico(musica.codigo)
    } catch (error) {
      console.error("[VideoPlayer] Error saving historico:", error)
    }

    const nota = Math.floor(Math.random() * 34) + 65
    const delay = goingToNextSong ? 400 : 800
    await new Promise(resolve => setTimeout(resolve, delay))

    const notaUrl = proximoCodigo
      ? `/nota?nota=${nota}&proximo=${encodeURIComponent(proximoCodigo)}`
      : `/nota?nota=${nota}`
    navigate(notaUrl)
  }, [musica.codigo, navigate, fila, useNativePlayer])

  // --- Iniciar player nativo quando tudo estiver pronto ---
  useEffect(() => {
    if (!rawPath || useNativePlayer !== true || nativeStartedRef.current) return
    nativeStartedRef.current = true

    playNative(rawPath).catch((err) => {
      console.error("[VideoPlayer] play_native falhou, usando <video>:", err)
      setUseNativePlayer(false)
      nativeStartedRef.current = false
    })
  }, [rawPath, useNativePlayer])

  // --- Poll para detectar fim do vídeo no player nativo ---
  useEffect(() => {
    if (useNativePlayer !== true) return

    pollIntervalRef.current = setInterval(async () => {
      try {
        const ended = await nativePlayerEnded()
        if (ended && !hasFinishedRef.current) {
          handleVideoEnd()
        }
      } catch {
        // ignore erros de poll
      }
    }, 500)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [useNativePlayer, handleVideoEnd])

  // --- Cleanup ao desmontar: matar mpv e restaurar janela ---
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (useNativePlayer) stopNative().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Garantir que o <video> HTML5 comece a tocar (fallback) ---
  useEffect(() => {
    if (useNativePlayer !== false || !videoSrc) return
    const video = videoRef.current
    if (!video) return

    const tryPlay = () => {
      if (video.paused && video.readyState >= 2) {
        video.play().catch((err) => {
          console.warn("[VideoPlayer] play() bloqueado, tentando muted:", err)
          video.muted = true
          video.play()
            .then(() => setTimeout(() => { video.muted = false }, 200))
            .catch(() => {})
        })
      }
    }

    tryPlay()
    video.addEventListener("canplay", tryPlay)
    return () => video.removeEventListener("canplay", tryPlay)
  }, [videoSrc, useNativePlayer])

  // --- Hold (segurar Enter para finalizar) ---
  const updateHoldProgress = useCallback(() => {
    if (!holdStartRef.current) return
    const elapsed = Date.now() - holdStartRef.current
    const progress = Math.min(elapsed / HOLD_DURATION, 1)
    setHoldProgress(progress)
    if (progress >= 1) {
      handleVideoEnd()
    } else {
      animationFrameRef.current = requestAnimationFrame(updateHoldProgress)
    }
  }, [handleVideoEnd])

  const startHold = useCallback(() => {
    if (hasFinishedRef.current || isExiting) return
    holdStartRef.current = Date.now()
    setIsHolding(true)
    setHoldProgress(0)
    animationFrameRef.current = requestAnimationFrame(updateHoldProgress)
  }, [updateHoldProgress, isExiting])

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

  // --- Adicionar à fila ao digitar 4-5 dígitos ---
  useEffect(() => {
    const codigo = searchQuery.replace(/\D/g, "")
    if (codigo.length < 4 || codigo.length > 5) return
    const codigoNorm = codigo.padStart(5, "0")
    if (/^0+$/.test(codigoNorm)) return
    let cancelled = false
    getMusicaByCodigo(codigoNorm)
      .then((data) => {
        if (cancelled) return
        if (data) {
          addToFila({ codigo: data.codigo, titulo: data.titulo, artista: data.artista ?? "" })
          toast.success(
            <div className="space-y-1 py-0.5">
              <p className="text-lg font-semibold leading-tight">{data.titulo}</p>
              <p className="text-base text-stone-600">para tocar como próxima</p>
            </div>,
            { duration: 4000, className: "min-w-[340px]" }
          )
        } else {
          toast.error("Código não encontrado")
        }
      })
      .catch(() => { if (!cancelled) toast.error("Erro ao verificar código") })
      .finally(() => { if (!cancelled) setSearchQuery("") })
    return () => { cancelled = true }
  }, [searchQuery, addToFila])

  // --- Listener de teclado ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isSearchInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.isContentEditable

      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }
      if (e.key === "Escape" && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().close()
        return
      }
      if (e.key === " " && !isSearchInput && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().minimize()
        return
      }
      if (e.code === "Delete" || e.key === "Delete" || e.code === "NumpadDecimal") {
        e.preventDefault()
        if (useNativePlayer) stopNative().catch(() => {})
        else videoRef.current?.pause()
        navigate("/")
        return
      }
      if (e.key === "+") {
        e.preventDefault()
        setVideoError(null)
        if (useNativePlayer && rawPath) {
          // Reiniciar: parar e relançar mpv
          stopNative().then(() => {
            nativeStartedRef.current = false
            hasFinishedRef.current = false
            if (rawPath) playNative(rawPath).catch(() => {})
          }).catch(() => {})
        } else {
          const video = videoRef.current
          if (video) { video.currentTime = 0; video.play().catch(() => {}) }
          else navigate("/")
        }
        return
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        musicaAleatoria()
          .then((cod) => {
            if (cod) navigate(`/tocar?c=${encodeURIComponent(cod)}`)
            else toast.info("Nenhuma música baixada. Pressione * para sincronizar.")
          })
          .catch(() => toast.error("Erro ao buscar música aleatória."))
        return
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        // Pausa não disponível no player nativo (mpv sem IPC); no fallback pausa o <video>
        if (!useNativePlayer) {
          const video = videoRef.current
          if (video) {
            if (video.paused) video.play().catch(() => {})
            else video.pause()
          }
        }
        return
      }
      if (e.key === "Enter" && !e.repeat) {
        if (isSearchInput || searchQuery.length > 0) {
          if (searchQuery.length > 0) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent("tocar-search-submit"))
          }
          return
        }
        startHold()
        return
      }
      if (!isSearchInput) {
        if (!isExiting && e.key === "Backspace" && !e.repeat && searchQuery.length > 0) {
          e.preventDefault()
          setSearchQuery((prev) => prev.slice(0, -1))
          return
        }
        if (e.code === "NumpadDecimal") return
        if (!isExiting && !e.repeat && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          setSearchQuery((prev) => prev + e.key)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isSearchInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.isContentEditable
      if (e.key === "Enter" && !isSearchInput) cancelHold()
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true })
    document.addEventListener("keyup", handleKeyUp, { capture: true })
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
      document.removeEventListener("keyup", handleKeyUp, { capture: true })
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [startHold, cancelHold, navigate, isExiting, searchQuery, configDialogOpen, useNativePlayer, rawPath])

  // Foco no container para teclas funcionarem
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Enquanto detecta disponibilidade do player, mostra preto
  if (useNativePlayer === undefined) {
    return <div className="fixed inset-0 bg-black" />
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`fixed inset-0 z-0 w-screen h-screen overflow-hidden outline-none transition-all duration-700 ${
        // Transparente quando usando mpv (vídeo aparece através do WebView2)
        // Preto quando usando <video> HTML5 fallback
        useNativePlayer ? "" : "bg-black"
      } ${
        isExiting && !transitionToNextSong ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{ maxWidth: "100vw", maxHeight: "100dvh" }}
    >
      {/* Logo no canto superior esquerdo (oculto no modo máquina) */}
      {!isModoMaquina && (
        <div className="absolute top-8 left-8 z-20 pointer-events-none">
          <div className="w-24 h-24 md:w-28 md:h-28">
            <img
              src="/logo-white.png"
              alt="Blue Karaokê"
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      )}

      {/* Barra de ferramentas ao pesquisar */}
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
          <button
            type="button"
            onClick={() => {
              musicaAleatoria()
                .then((cod) => { if (cod) navigate(`/tocar?c=${encodeURIComponent(cod)}`); else toast.info("Nenhuma música baixada.") })
                .catch(() => toast.error("Erro ao buscar música aleatória."))
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          >
            Tocar aleatória (C)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => {
              if (!useNativePlayer) {
                const v = videoRef.current
                if (v) { if (v.paused) v.play().catch(() => {}); else v.pause() }
              }
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          >
            Pausar (P)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => {
              if (useNativePlayer && rawPath) {
                stopNative().then(() => { nativeStartedRef.current = false; hasFinishedRef.current = false; if (rawPath) playNative(rawPath).catch(() => {}) }).catch(() => {})
              } else {
                const v = videoRef.current
                if (v) { v.currentTime = 0; v.play().catch(() => {}) } else navigate("/")
              }
            }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          >
            Reiniciar (+)
          </button>
          <span className="text-stone-400 select-none">·</span>
          <button
            type="button"
            onClick={() => { if (useNativePlayer) stopNative().catch(() => {}); else videoRef.current?.pause(); navigate("/") }}
            className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          >
            Cancelar (Delete)
          </button>
        </div>
      )}

      {/* Barra de busca ao pesquisar */}
      {searchQuery.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 min-h-48 bg-stone-100/90 backdrop-blur-sm flex flex-col justify-center pl-8 pr-8 py-4 gap-3">
          <p className="text-stone-800 text-xl font-medium">
            Próxima música — digite o código ou busque por nome/artista
          </p>
          <UnifiedSearch
            value={searchQuery}
            onChange={setSearchQuery}
            tipoChave={ativacaoStatus.tipo}
            onSelectCodigo={(codigo, info) => {
              addToFila({ codigo, titulo: info?.titulo, artista: info?.artista })
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

      {/* Vídeo HTML5 — só renderiza quando mpv NÃO está disponível (fallback) */}
      {useNativePlayer === false && videoSrc && (
        <video
          ref={videoRef}
          tabIndex={-1}
          className={`absolute inset-0 w-full h-full bg-black ${isModoMaquina ? "object-cover" : "object-contain"}`}
          src={videoSrc}
          autoPlay
          muted={false}
          controls={false}
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
          onCanPlay={(e) => {
            if (e.currentTarget.paused) e.currentTarget.play().catch(() => {})
          }}
          onError={(e) => {
            const err = e.currentTarget.error
            console.error("[VideoPlayer] Erro <video>:", err?.code, err?.message)
            setVideoError(`Erro ${err?.code}: ${err?.message || "falha ao carregar vídeo"}`)
          }}
        />
      )}

      {/* Fallback de erro */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="text-center space-y-4 max-w-lg px-8">
            <p className="text-red-400 text-2xl font-semibold">Não foi possível reproduzir</p>
            <p className="text-white/60 text-lg">{videoError}</p>
            <p className="text-white/40 text-base">
              Pressione <span className="text-cyan-400 font-mono">+</span> para tentar novamente ou{" "}
              <span className="text-cyan-400 font-mono">Delete</span> para voltar
            </p>
          </div>
        </div>
      )}

      {/* Overlay de transição */}
      {isExiting && (
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-purple-900/80 via-black to-cyan-900/80 flex items-center justify-center z-30 animate-pulse">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white text-2xl font-semibold">Calculando sua pontuação...</p>
          </div>
        </div>
      )}

      {/* Indicador de hold */}
      {isHolding && !isExiting && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-4 bg-black/40 backdrop-blur-sm rounded-3xl p-8">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
                <circle
                  cx="50" cy="50" r="45"
                  stroke="url(#gradient)" strokeWidth="6" fill="none"
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
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-3xl font-bold drop-shadow-lg">
                  {Math.round(holdProgress * 100)}%
                </span>
              </div>
            </div>
            <p className="text-white text-xl font-semibold drop-shadow-lg">Finalizando...</p>
          </div>
        </div>
      )}

      {/* Instrução no canto inferior (oculta no modo máquina) */}
      {!isExiting && !isModoMaquina && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white/40 text-lg">
              Segure <span className="text-cyan-400/60 font-mono">Enter</span> para finalizar
            </p>
          </div>
        </div>
      )}

      <ConfiguracoesDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />
    </div>
  )
}
