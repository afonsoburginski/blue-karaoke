import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Spotlight } from "@/components/ui/spotlight-new"
import { useAutoSync } from "@/hooks/useAutoSync"
import { AtivacaoDialog } from "@/components/ativacao-dialog"
import { UnifiedSearch } from "@/components/unified-search"
import { useAtivacao } from "@/hooks/use-ativacao"
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog"
import { QrCodesHome } from "@/components/qr-code"
import { toast } from "sonner"
import { Calendar, Clock, Pause, Settings } from "lucide-react"
import { getMusicaByCodigo, musicaAleatoria } from "@/lib/tauri"
import { getCurrentWindow } from "@tauri-apps/api/window"

function HomePageContent() {
  const [codigo, setCodigo] = useState("")
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ativacaoDialogOpen, setAtivacaoDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [blockDownloads, setBlockDownloads] = useState(() => {
    return localStorage.getItem("blue-karaoke-download-blocked") === "1"
  })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { status: ativacaoStatus, verificar: verificarAtivacao } = useAtivacao()
  const acabouDeAtivarRef = useRef(false)
  const [justActivated, setJustActivated] = useState(false)

  const isActivated = ativacaoStatus.ativada && !ativacaoStatus.expirada
  const isActivatedOrJustActivated = isActivated || justActivated

  const toggleBlockDownloads = useCallback(() => {
    setBlockDownloads((prev) => {
      const next = !prev
      localStorage.setItem("blue-karaoke-download-blocked", next ? "1" : "0")
      return next
    })
  }, [])

  const {
    downloadMetadata,
    downloadAllForOffline,
    startBackgroundDownload,
    offline,
    isDownloading,
    message: syncMessage
  } = useAutoSync({ intervalMinutes: 30, isActivated, blockDownloads })

  // Listener para atalho de sincronização (tecla *)
  useEffect(() => {
    const handleCheckNewMusic = async () => {
      if (!isActivated && !justActivated) return
      if (blockDownloads) {
        setBlockDownloads(false)
        localStorage.setItem("blue-karaoke-download-blocked", "0")
      }
      toast.info("Baixando músicas…")
      await downloadMetadata()
      startBackgroundDownload()
    }

    const handleDownloadAll = () => {
      console.log("Iniciando download completo para offline...")
      downloadAllForOffline()
    }

    window.addEventListener("checkNewMusic", handleCheckNewMusic)
    window.addEventListener("downloadAllOffline", handleDownloadAll)
    return () => {
      window.removeEventListener("checkNewMusic", handleCheckNewMusic)
      window.removeEventListener("downloadAllOffline", handleDownloadAll)
    }
  }, [downloadMetadata, downloadAllForOffline, startBackgroundDownload, isActivated, justActivated, blockDownloads])

  // Limpar "justActivated" quando o status real ficar ativado
  useEffect(() => {
    if (ativacaoStatus.ativada && !ativacaoStatus.expirada && justActivated) {
      setJustActivated(false)
    }
  }, [ativacaoStatus.ativada, ativacaoStatus.expirada, justActivated])

  // Toast quando voltar da página de tocar com música não encontrada
  useEffect(() => {
    if (searchParams.get("notfound") === "1") {
      toast.info("Música não encontrada ou ainda não baixada. Pressione * para sincronizar.")
      navigate("/", { replace: true })
    }
  }, [searchParams, navigate])

  // Verificar ativação ao carregar
  useEffect(() => {
    if (ativacaoStatus.modo === "loading") return
    if (acabouDeAtivarRef.current || justActivated) return

    if (!ativacaoStatus.ativada || ativacaoStatus.expirada) {
      setAtivacaoDialogOpen(true)
    }
  }, [ativacaoStatus, justActivated])

  const handleAtivacaoSucesso = useCallback(async () => {
    acabouDeAtivarRef.current = true
    setJustActivated(true)
    setAtivacaoDialogOpen(false)
    await verificarAtivacao()
    setTimeout(() => { acabouDeAtivarRef.current = false }, 5000)
    setTimeout(() => setJustActivated(false), 15000)
  }, [verificarAtivacao])

  const handleSubmit = useCallback(async () => {
    if (ativacaoStatus.modo === "loading") return
    if (!isActivatedOrJustActivated) {
      setAtivacaoDialogOpen(true)
      return
    }
    if (isLoading || codigo.length !== 5) return

    setIsLoading(true)
    try {
      const musica = await getMusicaByCodigo(codigo)
      if (musica) {
        navigate(`/tocar/${codigo}`)
      } else {
        setError(true)
        setTimeout(() => {
          setCodigo("")
          setError(false)
          setIsLoading(false)
        }, 2000)
      }
    } catch (err) {
      console.error("[Home] Error fetching music:", err)
      setError(true)
      setTimeout(() => {
        setCodigo("")
        setError(false)
        setIsLoading(false)
      }, 2000)
    }
  }, [codigo, isLoading, navigate, isActivatedOrJustActivated, ativacaoStatus.modo])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]")

      // F12 = abrir Configurações
      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }

      // Esc = fechar app (Tauri)
      if (e.key === "Escape" && !ativacaoDialogOpen && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().close()
        return
      }

      // Espaço = minimizar
      if (e.key === " " && !isInputElement && !ativacaoDialogOpen && !configDialogOpen) {
        e.preventDefault()
        getCurrentWindow().minimize()
        return
      }

      // * ou Multiply (numpad): sincronização
      if (isActivatedOrJustActivated && (e.key === "*" || e.key === "Multiply" || e.code === "NumpadMultiply")) {
        window.dispatchEvent(new CustomEvent("checkNewMusic"))
        e.preventDefault()
        return
      }

      if (ativacaoDialogOpen || configDialogOpen || isInputElement) {
        return
      }

      if (!isActivatedOrJustActivated) {
        if (e.key !== "Escape") e.preventDefault()
        if (e.key === "Enter" || (e.key >= "0" && e.key <= "9")) {
          setAtivacaoDialogOpen(true)
        }
        return
      }

      if (e.key >= "0" && e.key <= "9") {
        if (codigo.length < 5 && !error && !isLoading) {
          setCodigo((prev) => prev + e.key)
        }
        e.preventDefault()
      } else if (e.key === "Enter" && codigo.length === 5 && !isLoading) {
        handleSubmit()
        e.preventDefault()
      } else if (e.key === "Backspace") {
        setCodigo((prev) => prev.slice(0, -1))
        setError(false)
        e.preventDefault()
      } else if (e.key === "Delete") {
        setCodigo("")
        setError(false)
        e.preventDefault()
      } else if (e.key === "+") {
        navigate("/")
        e.preventDefault()
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        musicaAleatoria()
          .then((cod) => {
            if (cod) navigate(`/tocar/${cod}`)
            else toast.info("Nenhuma música baixada. Pressione * para sincronizar.")
          })
          .catch(() => toast.error("Erro ao buscar música aleatória."))
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        toggleBlockDownloads()
        toast.info(blockDownloads ? "Downloads retomados" : "Downloads pausados")
      } else {
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [codigo, error, isLoading, handleSubmit, isActivatedOrJustActivated, ativacaoDialogOpen, configDialogOpen, navigate, toggleBlockDownloads, blockDownloads])

  // Loading state
  if (ativacaoStatus.modo === "loading") {
    return (
      <main className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center">
        <div
          className="absolute inset-0 blur-sm scale-105"
          style={{
            backgroundImage: `url('/images/image.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-40 h-40">
            <img
              src="/logo-white.png"
              alt="Blue Karaokê"
              className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-pulse"
            />
          </div>
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      <div
        className="absolute inset-0 blur-sm scale-105"
        style={{
          backgroundImage: `url('/images/image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <Spotlight />

      {/* Logo no canto superior esquerdo */}
      <div className="absolute top-8 left-8 z-20">
        <div className="w-32 h-32 md:w-40 md:h-40">
          <img
            src="/logo-white.png"
            alt="Blue Karaokê"
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>

      {/* Canto superior direito: configurações + componentes de download */}
      <div className="absolute right-8 z-20 top-16 flex flex-col items-end gap-3">
        <div className="w-max bg-stone-100/90 backdrop-blur-sm shadow-md py-3 px-8 rounded-lg">
          <button
            type="button"
            onClick={() => setConfigDialogOpen(true)}
            className="inline-flex items-center gap-2 text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
            title="Configurações (F12)"
          >
            <Settings className="h-5 w-5 opacity-70" aria-hidden />
            Configurações (F12)
          </button>
        </div>
        {isActivatedOrJustActivated && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white border-2 border-stone-300 text-stone-800 shadow-sm">
              <span className="text-stone-700 text-xl font-medium">
                🎵 {offline.musicasOffline} de {offline.totalMusicas ?? (offline.musicasOffline + (offline.musicasOnline || 0))} músicas
              </span>
              {(syncMessage || isDownloading) && (
                <>
                  <span className="text-stone-400">|</span>
                  {blockDownloads ? (
                    <button
                      type="button"
                      onClick={toggleBlockDownloads}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      title="Clique para retomar (P)"
                    >
                      <Pause className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="text-amber-700 text-xl font-medium">Pausado</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleBlockDownloads}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      title="Clique para pausar (P)"
                    >
                      <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-cyan-700 text-xl font-medium">
                        {isDownloading ? "Baixando…" : (syncMessage || "Sincronizando…")}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status de Ativação no canto superior direito */}
      {isActivatedOrJustActivated && (
        <div className="absolute top-8 right-8 z-20 px-4">
          <div className="flex items-center gap-2 whitespace-nowrap text-white">
            {ativacaoStatus.diasRestantes !== null ? (
              <Calendar className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-sm md:text-base font-semibold">
              {ativacaoStatus.diasRestantes !== null
                ? `${ativacaoStatus.diasRestantes} dias restantes`
                : ativacaoStatus.horasRestantes !== null
                  ? `${Math.floor(ativacaoStatus.horasRestantes)} horas restantes`
                  : "Sistema ativado"}
            </span>
          </div>
        </div>
      )}

      {/* Barra inferior: busca + status */}
      <div className="absolute bottom-0 left-0 right-0 z-10 min-h-72 flex items-center justify-between pl-0 pr-8 py-6 gap-8">
        <div className="min-w-0 max-w-3xl space-y-4 flex-1 flex flex-col items-start pl-8">
          <h1 className="text-3xl md:text-4xl text-white font-semibold tracking-wide">
            Busque por código, nome ou artista
          </h1>

          {isActivatedOrJustActivated && (
            <UnifiedSearch />
          )}

          {error && (
            <p className="text-red-700 text-base font-medium">Código inválido! Tente novamente.</p>
          )}

          {isActivatedOrJustActivated && (
            <div className="space-y-0.5 text-white text-2xl">
              <p>Digite o <span className="font-semibold text-white">código</span> ou <span className="font-semibold text-white">nome da música</span></p>
              <p className="text-white/90">Pressione <span className="font-medium text-white">Enter</span> ou clique no resultado</p>
              <p className="text-white/90">Pressione <span className="font-medium text-white">*</span> (asterisco) para <span className="font-medium text-white">baixar/sincronizar músicas</span></p>
            </div>
          )}
        </div>

        {isActivatedOrJustActivated && (
          <div id="search-selected-center" className="flex-1 min-w-0 flex items-center justify-center px-4" />
        )}
      </div>

      {/* QR codes no canto inferior direito */}
      <div className="absolute right-8 bottom-8 z-20">
        <QrCodesHome />
      </div>

      <AtivacaoDialog
        open={ativacaoDialogOpen}
        onOpenChange={setAtivacaoDialogOpen}
        onAtivacaoSucesso={handleAtivacaoSucesso}
      />
      <ConfiguracoesDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />
    </main>
  )
}

export default function Home() {
  return <HomePageContent />
}
