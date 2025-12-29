"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from "react"

interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export default function VideoPlayer({ musica }: { musica: Musica }) {
  const router = useRouter()
  const [showSkipButton, setShowSkipButton] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkipButton(true)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  const handleVideoEnd = useCallback(async () => {
    try {
      // Buscar musicaId se disponível
      let musicaId: string | undefined
      try {
        const musicaResponse = await fetch(`/api/musicas?codigo=${musica.codigo}`)
        if (musicaResponse.ok) {
          const musicaData = await musicaResponse.json()
          musicaId = musicaData.id
        }
      } catch (error) {
        console.error("Erro ao buscar musicaId:", error)
      }

      // Salvar histórico (salva localmente primeiro, sincroniza depois)
      await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: musica.codigo,
          musicaId,
        }),
      })

      router.push(`/tocar/${musica.codigo}/finalizado`)
    } catch (error) {
      console.error("[v0] Error saving historico:", error)
      router.push(`/tocar/${musica.codigo}/finalizado`)
    }
  }, [musica.codigo, router])

  const isLocalFile = musica.arquivo.startsWith("/api/musicas/")
  const isYouTube = musica.arquivo.includes("youtube.com") || musica.arquivo.includes("youtu.be")

  return (
    <div className="relative min-h-screen bg-black">
      {/* Video player - suporta arquivos locais e YouTube */}
      {isLocalFile ? (
        <video
          className="w-full h-screen object-cover"
          src={musica.arquivo}
          autoPlay
          muted={false}
          controls={false}
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
        />
      ) : isYouTube ? (
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
          src={musica.arquivo}
          autoPlay
          muted={false}
          controls={false}
          playsInline
          loop={false}
          onEnded={handleVideoEnd}
        />
      )}

      {/* Camada transparente para bloquear interações */}
      <div className="absolute inset-0 pointer-events-auto bg-transparent z-10" />

      {/* Botão de finalizar após 10 segundos */}
      {showSkipButton && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <button
            onClick={handleVideoEnd}
            className="pointer-events-auto bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.8)]"
          >
            Finalizar e Ver Nota
          </button>
        </div>
      )}
    </div>
  )
}
