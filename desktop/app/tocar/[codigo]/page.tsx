"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import VideoPlayer from "./video-player"

interface Musica {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export default function TocarPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const router = useRouter()
  const [codigo, setCodigo] = useState<string | null>(null)
  const [musica, setMusica] = useState<Musica | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function unwrapParams() {
      const { codigo: codigoValue } = await params
      setCodigo(codigoValue)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!codigo) return

    async function fetchMusica() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/musica/${codigo}`)
        const data = await response.json()
        
        if (data.exists && data.musica) {
          setMusica(data.musica)
        } else {
          router.replace("/?notfound=1")
          return
        }
      } catch (error) {
        console.error("[TocarPage] Erro ao buscar música:", error)
        router.replace("/?notfound=1")
        return
      } finally {
        setIsLoading(false)
      }
    }

    fetchMusica()
  }, [codigo, router])

  if (isLoading || !musica) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return <VideoPlayer musica={musica} />
}
