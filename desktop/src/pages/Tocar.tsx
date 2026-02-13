import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import VideoPlayer from "@/components/video-player"
import { getMusicaByCodigo, getVideoPath, type MusicaSimple } from "@/lib/tauri"

const CODIGO_INVALIDO = /^0+$/ // "0", "00", "000", "0000", "00000" não são códigos válidos

function getCodigoFromUrl(): string {
  if (typeof window === "undefined") return ""
  const params = new URLSearchParams(window.location.search)
  return (params.get("c") ?? params.get("codigo") ?? "").trim()
}

export default function TocarPage() {
  const [searchParams] = useSearchParams()
  const codigoRaw = searchParams.get("c") ?? searchParams.get("codigo") ?? ""
  const codigo = codigoRaw.trim() || getCodigoFromUrl()
  const navigate = useNavigate()
  const [musica, setMusica] = useState<MusicaSimple | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!codigo) {
      navigate("/", { replace: true })
      return
    }
    const codigoNorm = /^\d{4,5}$/.test(codigo) ? codigo.padStart(5, "0") : codigo
    if (CODIGO_INVALIDO.test(codigoNorm)) {
      navigate("/?notfound=1", { replace: true })
      return
    }

    async function fetchMusica() {
      setIsLoading(true)
      try {
        let data = await getMusicaByCodigo(codigoNorm)
        if (!data) {
          const path = await getVideoPath(codigoNorm).catch(() => null)
          if (path) {
            data = { codigo: codigoNorm, artista: "Desconhecido", titulo: codigoNorm, arquivo: path }
          }
        }
        if (data) {
          setMusica(data)
        } else {
          navigate("/?notfound=1", { replace: true })
          return
        }
      } catch (error) {
        console.error("[TocarPage] Erro ao buscar música:", error)
        try {
          const path = await getVideoPath(codigoNorm)
          if (path) {
            setMusica({ codigo: codigoNorm, artista: "Desconhecido", titulo: codigoNorm, arquivo: path })
            return
          }
        } catch {
          // ignore
        }
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
