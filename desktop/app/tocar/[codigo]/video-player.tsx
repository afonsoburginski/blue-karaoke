"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from "react"

interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

const HOLD_DURATION = 800 // 0.8 segundos para acionar (resposta rápida)

export default function VideoPlayer({ musica }: { musica: Musica }) {
  const router = useRouter()
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasFinishedRef = useRef(false)

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
    
    // Redirecionar para a página de nota
    router.push(`/nota?nota=${nota}`)
  }, [musica.codigo, router])

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

  // Listener de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) {
        startHold()
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
  }, [startHold, cancelHold])

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
    </div>
  )
}
