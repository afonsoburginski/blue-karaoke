import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import VideoPlayer from "@/components/video-player"
import { getMusicaByCodigo, type MusicaSimple } from "@/lib/tauri"

export default function TocarPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [musica, setMusica] = useState<MusicaSimple | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!codigo) return

    async function fetchMusica() {
      setIsLoading(true)
      try {
        const data = await getMusicaByCodigo(codigo!)
        if (data) {
          setMusica(data)
        } else {
          navigate("/?notfound=1", { replace: true })
          return
        }
      } catch (error) {
        console.error("[TocarPage] Erro ao buscar música:", error)
        navigate("/?notfound=1", { replace: true })
        return
      } finally {
        setIsLoading(false)
      }
    }

    fetchMusica()
  }, [codigo, navigate])

  if (isLoading || !musica) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return <VideoPlayer musica={musica} />
}
