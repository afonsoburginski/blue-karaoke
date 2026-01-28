"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { useFilaProxima } from "@/contexts/fila-proxima"
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog"
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
  const [digitBuffer, setDigitBuffer] = useState("")
  const [openAtLogin, setOpenAtLoginState] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasFinishedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
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

    // Iniciar animação de saída
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

    // Esperar a animação de fade out
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Se há próxima na fila, tocar; senão ir para nota
    const proximoCodigo = fila[0]
    if (proximoCodigo) {
      removeFromFila()
      router.push(`/tocar/${proximoCodigo}`)
    } else {
      router.push(`/nota?nota=${nota}`)
    }
  }, [musica.codigo, router, fila, removeFromFila])

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

  // Ao completar 5 dígitos durante a reprodução: validar e adicionar à fila
  useEffect(() => {
    if (digitBuffer.length !== 5) return
    const codigo = digitBuffer
    let cancelled = false
    fetch(`/api/musica/${codigo}`)
      .then((r) => r.json())
      .then((data: { exists?: boolean }) => {
        if (cancelled) return
        if (data.exists) {
          addToFila(codigo)
          toast.success("Adicionado à fila")
        } else {
          toast.error("Código não encontrado")
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Erro ao verificar código")
      })
      .finally(() => {
        if (!cancelled) setDigitBuffer("")
      })
    return () => {
      cancelled = true
    }
  }, [digitBuffer, addToFila])

  // Listener de teclado: F12, Delete, +, C, P, Enter, Backspace, 0-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }
      if (e.key === "Delete") {
        e.preventDefault()
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
      // C = tocar música aleatória
      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        fetch("/api/musicas/aleatoria")
          .then((r) => r.json())
          .then((data: { codigo: string | null }) => {
            if (data.codigo) router.push(`/tocar/${data.codigo}`)
          })
          .catch(() => {})
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
      if (e.key === "Enter" && !e.repeat) {
        startHold()
        return
      }
      if (!isExiting && e.key === "Backspace" && !e.repeat) {
        e.preventDefault()
        setDigitBuffer((prev) => prev.slice(0, -1))
        return
      }
      if (!isExiting && e.key >= "0" && e.key <= "9" && !e.repeat) {
        e.preventDefault()
        setDigitBuffer((prev) => (prev + e.key).slice(0, 5))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        cancelHold()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [startHold, cancelHold, router, isExiting])

  const isYouTube = musica.arquivo.includes("youtube.com") || musica.arquivo.includes("youtu.be")
  const isRemoteUrl = musica.arquivo.startsWith("http://") || musica.arquivo.startsWith("https://")
  
  // Determinar URL do vídeo
  const videoSrc = isRemoteUrl 
    ? musica.arquivo 
    : `/api/video/${musica.codigo}`

  return (
    <div 
      className={`relative min-h-screen bg-black transition-all duration-700 ${
        isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
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

      {/* Barra de tarefas: atalhos em texto clicável */}
      <div className="absolute left-0 right-0 z-20 top-36 md:top-40 bg-stone-100/90 backdrop-blur-sm shadow-md py-3 px-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setConfigDialogOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          title="Configurações (F12)"
        >
          <Settings className="h-4 w-4 opacity-70" aria-hidden />
          Configurações (F12)
        </button>
        <span className="text-stone-400 select-none">·</span>
        {isElectron && (
          <>
            <button
              type="button"
              onClick={() => (window as { electron?: { quit?: () => void } }).electron?.quit?.()}
              className="text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
              title="Fechar Programa (ESC)"
            >
              Fechar Programa (ESC)
            </button>
            <span className="text-stone-400 select-none">·</span>
            <button
              type="button"
              onClick={() => (window as { electron?: { minimize?: () => void } }).electron?.minimize?.()}
              className="text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
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
              })
              .catch(() => {})
          }}
          className="text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
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
          className="text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
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
          className="text-sm text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          title="Reiniciar música (+)"
        >
          Reiniciar música (+)
        </button>
      </div>

      {/* Video player */}
      {isYouTube ? (
        <iframe
          className="w-full h-screen"
          src={`${musica.arquivo}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Karaoke Video"
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-screen object-cover"
          src={videoSrc}
          autoPlay
          muted={false}
          controls={false}
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
        />
      )}

      {/* Camada transparente para bloquear interações do mouse */}
      <div className="absolute inset-0 pointer-events-auto bg-transparent z-10" />

      {/* Overlay de transição */}
      {isExiting && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-black to-cyan-900/80 flex items-center justify-center z-30 animate-pulse">
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
            <p className="text-white/40 text-sm">
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
