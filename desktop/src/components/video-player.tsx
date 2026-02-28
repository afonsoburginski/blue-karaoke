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
import { useAtalhos } from "@/hooks/use-atalhos"
import { matchKey, formatarTecla, keyFromEvent } from "@/lib/atalhos"


export default function VideoPlayer({ musica }: { musica: MusicaSimple }) {
  const navigate = useNavigate()
  const { fila, addToFila } = useFilaProxima()
  const { status: ativacaoStatus } = useAtivacao()
  const isModoMaquina = ativacaoStatus.tipo === "maquina"

  const [isExiting, setIsExiting] = useState(false)
  const [transitionToNextSong, setTransitionToNextSong] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  // Preview da música ao digitar código numérico
  const [previewMusica, setPreviewMusica] = useState<MusicaSimple | null | "loading" | "not_found">(null)
  const previewMusicaRef = useRef<MusicaSimple | null | "loading" | "not_found">(null)

  // Paths: rawPath para mpv nativo, videoSrc para <video> HTML5 (fallback)
  const [rawPath, setRawPath] = useState<string | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  // Player nativo (mpv): undefined = detectando, true = disponível, false = usar <video>
  const [useNativePlayer, setUseNativePlayer] = useState<boolean | undefined>(undefined)
  const nativeStartedRef = useRef(false)

  const { getKey } = useAtalhos()

  const hasFinishedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Evita múltiplas navegações por pressões rápidas de tecla (C / aleatória)
  const isChangingSongRef = useRef(false)

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


  // --- Preview de música ao digitar código numérico (4-5 dígitos) ---
  // Não adiciona à fila automaticamente — usuário confirma com Enter
  useEffect(() => {
    const isOnlyDigits = searchQuery.length > 0 && /^\d+$/.test(searchQuery)
    const digits = searchQuery.replace(/\D/g, "")

    if (!isOnlyDigits || digits.length < 4 || digits.length > 5) {
      const next = null
      setPreviewMusica(next)
      previewMusicaRef.current = next
      return
    }

    const codigoNorm = digits.padStart(5, "0")
    if (/^0+$/.test(codigoNorm)) return

    setPreviewMusica("loading")
    previewMusicaRef.current = "loading"
    let cancelled = false
    getMusicaByCodigo(codigoNorm)
      .then((data) => {
        if (cancelled) return
        const next = data ?? "not_found"
        setPreviewMusica(next)
        previewMusicaRef.current = next
      })
      .catch(() => {
        if (cancelled) return
        setPreviewMusica("not_found")
        previewMusicaRef.current = "not_found"
      })
    return () => { cancelled = true }
  }, [searchQuery])

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

      // F12 = abrir configurações (fixo)
      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }

      // Fechar app
      if (matchKey(e, getKey("fechar")) && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().close()
        return
      }

      // Minimizar
      if (matchKey(e, getKey("minimizar")) && !isSearchInput && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().minimize()
        return
      }

      // Cancelar: se há busca ativa, limpa; caso contrário sai do player
      if (matchKey(e, getKey("cancelar")) || e.code === "NumpadDecimal") {
        e.preventDefault()
        if (searchQuery.length > 0) {
          setSearchQuery("")
          setPreviewMusica(null)
          previewMusicaRef.current = null
        } else {
          if (useNativePlayer) stopNative().catch(() => {})
          else videoRef.current?.pause()
          navigate("/")
        }
        return
      }

      // Reiniciar música
      if (matchKey(e, getKey("reiniciar"))) {
        e.preventDefault()
        setVideoError(null)
        if (useNativePlayer && rawPath) {
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

      // Tocar aleatória — debounce para evitar múltiplas navegações
      if (matchKey(e, getKey("aleatorio"))) {
        e.preventDefault()
        if (isChangingSongRef.current) return
        isChangingSongRef.current = true
        toast.loading("Buscando música aleatória…", { id: "aleatorio", duration: 5000 })
        musicaAleatoria()
          .then((cod) => {
            if (cod) {
              toast.dismiss("aleatorio")
              navigate(`/tocar?c=${encodeURIComponent(cod)}`)
            } else {
              isChangingSongRef.current = false
              toast.info("Nenhuma música baixada. Pressione * para sincronizar.", { id: "aleatorio" })
            }
          })
          .catch(() => {
            isChangingSongRef.current = false
            toast.error("Erro ao buscar música aleatória.", { id: "aleatorio" })
          })
        return
      }

      // Pausar / retomar reprodução
      if (matchKey(e, getKey("pausar"))) {
        e.preventDefault()
        if (!useNativePlayer) {
          const video = videoRef.current
          if (video) {
            if (video.paused) video.play().catch(() => {})
            else video.pause()
          }
        }
        return
      }

      if (e.key === "Enter" && !e.repeat && searchQuery.length > 0) {
        e.preventDefault()
        const preview = previewMusicaRef.current
        if (preview && preview !== "loading" && preview !== "not_found") {
          // Código numérico confirmado — adiciona à fila
          addToFila({ codigo: preview.codigo, titulo: preview.titulo, artista: preview.artista ?? "" })
          toast.success(
            <div className="space-y-1 py-0.5">
              <p className="text-lg font-semibold leading-tight">{preview.titulo}</p>
              <p className="text-base text-stone-600">adicionada como próxima</p>
            </div>,
            { duration: 4000, className: "min-w-[340px]" }
          )
          setSearchQuery("")
        } else {
          // Busca por texto — delega ao UnifiedSearch
          window.dispatchEvent(new CustomEvent("tocar-search-submit"))
        }
        return
      }

      if (!isSearchInput) {
        if (!isExiting && e.key === "Backspace" && !e.repeat && searchQuery.length > 0) {
          e.preventDefault()
          setSearchQuery((prev) => prev.slice(0, -1))
          return
        }
        // Nunca adiciona ao search uma tecla que seja atalho do sistema
        const tecla = keyFromEvent(e)
        const isAtalho =
          matchKey(e, getKey("cancelar")) ||
          matchKey(e, getKey("reiniciar")) ||
          matchKey(e, getKey("aleatorio")) ||
          matchKey(e, getKey("pausar")) ||
          matchKey(e, getKey("fechar")) ||
          matchKey(e, getKey("minimizar")) ||
          e.code === "NumpadDecimal" ||
          e.key === "Delete" ||
          tecla === getKey("cancelar")
        if (isAtalho) {
          e.preventDefault()
          return
        }
        if (!isExiting && !e.repeat && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          setSearchQuery((prev) => prev + e.key)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [navigate, isExiting, searchQuery, configDialogOpen, useNativePlayer, rawPath, getKey, addToFila])

  // Foco no container para teclas funcionarem
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Torna body/html completamente transparente quando o player nativo está ativo,
  // para que o vídeo da janela Win32 (abaixo do WebView2) apareça visível.
  useEffect(() => {
    if (useNativePlayer !== true) return
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.background
    const prevBodyBg = body.style.background
    html.setAttribute("data-native-player", "true")
    html.style.background = "transparent"
    body.style.background = "transparent"
    return () => {
      html.removeAttribute("data-native-player")
      html.style.background = prevHtmlBg
      body.style.background = prevBodyBg
    }
  }, [useNativePlayer])

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

      {/* Overlay de busca — próxima música */}
      {searchQuery.length > 0 && (() => {
        const isCodeMode = /^\d+$/.test(searchQuery)
        const digits = searchQuery.replace(/\D/g, "")
        const slots = [0, 1, 2, 3, 4]
        const canConfirm = previewMusica && previewMusica !== "loading" && previewMusica !== "not_found"

        return (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-950/95 backdrop-blur-md border-t border-stone-800/60">
            {isCodeMode ? (
              /* ── Modo código numérico ─────────────────────────── */
              <div className="px-8 py-6 flex flex-col gap-5">
                <p className="text-stone-400 text-base uppercase tracking-widest font-medium select-none">
                  Próxima música — código
                </p>

                {/* Slots de dígitos + preview lado a lado */}
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Slots */}
                  <div className="flex gap-2">
                    {slots.map((i) => {
                      const char = digits[i]
                      const isActive = i === digits.length
                      return (
                        <div
                          key={i}
                          className={`w-14 h-16 flex items-center justify-center rounded-xl border-2 text-3xl font-mono font-bold transition-all ${
                            char
                              ? "border-cyan-400 bg-cyan-400/10 text-white"
                              : isActive
                              ? "border-cyan-400/50 bg-stone-800 text-stone-600 animate-pulse"
                              : "border-stone-700 bg-stone-900 text-stone-700"
                          }`}
                        >
                          {char ?? "·"}
                        </div>
                      )
                    })}
                  </div>

                  {/* Preview da música */}
                  <div className="flex-1 min-w-0">
                    {previewMusica === "loading" && (
                      <div className="flex items-center gap-3 text-stone-400">
                        <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-lg">Buscando...</span>
                      </div>
                    )}
                    {canConfirm && (
                      <div className="space-y-1">
                        <p className="text-white text-2xl font-semibold leading-tight truncate">
                          {(previewMusica as MusicaSimple).titulo}
                        </p>
                        <p className="text-stone-400 text-lg truncate">
                          {(previewMusica as MusicaSimple).artista ?? "—"}
                        </p>
                      </div>
                    )}
                    {previewMusica === "not_found" && digits.length >= 4 && (
                      <p className="text-red-400 text-lg font-medium">Código não encontrado</p>
                    )}
                    {!previewMusica && digits.length < 4 && (
                      <p className="text-stone-600 text-lg">
                        {5 - digits.length} dígito{5 - digits.length !== 1 ? "s" : ""} restante{5 - digits.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Instrução */}
                <p className="text-stone-600 text-sm select-none">
                  {canConfirm
                    ? <><span className="text-cyan-400 font-mono">Enter</span> para adicionar à fila · <span className="font-mono">←</span> para apagar · <span className="text-stone-500 font-mono">{formatarTecla(getKey("cancelar"))}</span> para cancelar</>
                    : <><span className="font-mono">←</span> para apagar · <span className="text-stone-500 font-mono">{formatarTecla(getKey("cancelar"))}</span> para cancelar</>
                  }
                </p>
              </div>
            ) : (
              /* ── Modo busca por texto ─────────────────────────── */
              <div className="px-8 py-5 flex flex-col gap-3">
                <p className="text-stone-400 text-base uppercase tracking-widest font-medium select-none">
                  Próxima música — busca por nome / artista
                </p>
                <UnifiedSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  tipoChave={ativacaoStatus.tipo}
                  onSelectCodigo={(codigo, info) => {
                    addToFila({ codigo, titulo: info?.titulo, artista: info?.artista })
                    toast.success(
                      <div className="space-y-1 py-0.5">
                        <p className="text-lg font-semibold leading-tight">{info?.titulo ?? "Música"}</p>
                        <p className="text-base text-stone-600">adicionada como próxima</p>
                      </div>,
                      { duration: 4000, className: "min-w-[340px]" }
                    )
                    setSearchQuery("")
                  }}
                />
                <p className="text-stone-600 text-sm select-none">
                  <span className="text-stone-500 font-mono">{formatarTecla(getKey("cancelar"))}</span> para cancelar
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Vídeo HTML5 — só renderiza quando mpv NÃO está disponível (fallback) */}
      {useNativePlayer === false && videoSrc && (
        <video
          ref={videoRef}
          tabIndex={-1}
          className="absolute inset-0 w-full h-full bg-black object-contain"
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
              Pressione{" "}
              <span className="text-cyan-400 font-mono">{formatarTecla(getKey("reiniciar"))}</span>{" "}
              para tentar novamente ou{" "}
              <span className="text-cyan-400 font-mono">{formatarTecla(getKey("cancelar"))}</span>{" "}
              para voltar
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


      {/* Instrução no canto inferior (oculta no modo máquina) */}
      {!isExiting && !isModoMaquina && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white/40 text-lg">
              <span className="text-cyan-400/40 font-mono">{formatarTecla(getKey("cancelar"))}</span>{" "}
              para sair ·{" "}
              <span className="text-cyan-400/40 font-mono">{formatarTecla(getKey("aleatorio"))}</span>{" "}
              aleatória
            </p>
          </div>
        </div>
      )}

      <ConfiguracoesDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />
    </div>
  )
}
