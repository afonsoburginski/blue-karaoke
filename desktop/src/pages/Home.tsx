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
import { Calendar, Clock, Settings } from "lucide-react"
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const syncToastIdRef = useRef<string | number | null>(null)

  const isActivated = ativacaoStatus.ativada && !ativacaoStatus.expirada
  const isActivatedOrJustActivated = isActivated || justActivated
  const isModoMaquina = ativacaoStatus.tipo === "maquina"

  const setCodigoMaquina = useCallback((v: string) => {
    setCodigo(v.replace(/\D/g, "").slice(0, 5))
  }, [])

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
      const tid = toast.loading("Sincronizando músicas…")
      syncToastIdRef.current = tid
      await downloadMetadata()
      startBackgroundDownload()
      // Se nenhum download iniciar em 3s (nada pendente), mostra sucesso
      setTimeout(() => {
        if (syncToastIdRef.current === tid) {
          toast.success("Músicas sincronizadas!", { id: tid })
          syncToastIdRef.current = null
        }
      }, 3000)
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

  // Atualizar toast de sync: loading → success quando download terminar
  const prevIsDownloadingRef = useRef(false)
  useEffect(() => {
    const wasDownloading = prevIsDownloadingRef.current
    prevIsDownloadingRef.current = isDownloading

    if (syncToastIdRef.current == null) return
    // Só mostra sucesso quando isDownloading transiciona de true → false
    if (wasDownloading && !isDownloading) {
      toast.success("Músicas sincronizadas!", { id: syncToastIdRef.current })
      syncToastIdRef.current = null
    }
  }, [isDownloading])

  // Limpar "justActivated" quando o status real ficar ativado
  useEffect(() => {
    if (ativacaoStatus.ativada && !ativacaoStatus.expirada && justActivated) {
      setJustActivated(false)
    }
  }, [ativacaoStatus.ativada, ativacaoStatus.expirada, justActivated])

  // Modo máquina sem mouse: focar o input ao carregar para que digitar funcione sem clicar
  useEffect(() => {
    if (!isModoMaquina || !isActivatedOrJustActivated) return
    const focusInput = () => searchInputRef.current?.focus()
    const t1 = setTimeout(focusInput, 200)
    const t2 = setTimeout(focusInput, 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isModoMaquina, isActivatedOrJustActivated])

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
    const codigoNorm = codigo.padStart(5, "0")
    if (/^0+$/.test(codigoNorm) || isLoading || codigo.length < 4 || codigo.length > 5) return

    setIsLoading(true)
    try {
      const musica = await getMusicaByCodigo(codigoNorm)
      if (musica) {
        navigate(`/tocar?c=${encodeURIComponent(codigoNorm)}`)
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

      // * ou Multiply (numpad): sincronização (só se não estiver no input)
      if (!isInputElement && isActivatedOrJustActivated && (e.key === "*" || e.key === "Multiply" || e.code === "NumpadMultiply")) {
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
      } else if (e.key === "Enter" && codigo.length >= 4 && codigo.length <= 5 && !isLoading) {
        handleSubmit()
        e.preventDefault()
      } else if (e.key === "Backspace") {
        setCodigo((prev) => prev.slice(0, -1))
        setError(false)
        e.preventDefault()
      } else if (e.key === "Delete" || e.code === "NumpadDecimal") {
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
            if (cod) navigate(`/tocar?c=${encodeURIComponent(cod)}`)
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

      {/* Canto superior direito: configurações */}
      <div className="absolute right-8 z-20 top-16">
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

      {/* Barra inferior: coluna esquerda (título + input + instruções) e coluna direita (detalhes da música) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 min-h-72 flex items-start justify-between pl-8 pr-8 py-6 gap-8">
        <div className="min-w-0 max-w-3xl flex-1 flex flex-col items-start space-y-4">
          <h1 className={`whitespace-nowrap ${isModoMaquina ? "text-4xl md:text-5xl text-white font-semibold tracking-wide" : "text-3xl md:text-4xl text-white font-semibold tracking-wide"}`}>
            {isModoMaquina ? "Busque por código" : "Busque por código, nome ou artista"}
          </h1>

          {isActivatedOrJustActivated && (
            <UnifiedSearch
              autoFocus
              tipoChave={ativacaoStatus.tipo}
              {...(isModoMaquina
                ? {
                    value: codigo,
                    onChange: setCodigoMaquina,
                    inputRef: searchInputRef,
                  }
                : {})}
            />
          )}

          {error && (
            <p className={isModoMaquina ? "text-red-700 text-xl font-medium" : "text-red-700 text-base font-medium"}>Código inválido! Tente novamente.</p>
          )}

          {isActivatedOrJustActivated && (
            <div className={isModoMaquina ? "space-y-1 text-white text-3xl md:text-4xl" : "space-y-0.5 text-white text-2xl"}>
              <p>Digite o <span className="font-semibold text-white">código</span> ou <span className="font-semibold text-white">nome da música</span></p>
              <p className="text-white/90">Pressione <span className="font-medium text-white">Enter</span> ou clique no resultado</p>
            </div>
          )}
        </div>

        {isActivatedOrJustActivated && (
          <div id="search-selected-center" className="flex-1 min-w-0 flex items-start justify-start pt-14 pl-0 -ml-24" />
        )}
      </div>

      {/* QR codes no canto inferior direito */}
      <div className="absolute right-8 bottom-8 z-20">
        <QrCodesHome modoMaquina={isModoMaquina} />
      </div>

      <AtivacaoDialog
        open={ativacaoDialogOpen}
        onOpenChange={setAtivacaoDialogOpen}
        onAtivacaoSucesso={handleAtivacaoSucesso}
      />
      <ConfiguracoesDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        offline={isActivatedOrJustActivated ? offline : undefined}
        syncMessage={syncMessage ?? undefined}
        isDownloading={isDownloading}
        blockDownloads={blockDownloads}
        onToggleBlockDownloads={toggleBlockDownloads}
      />
    </main>
  )
}

export default function Home() {
  return <HomePageContent />
}
