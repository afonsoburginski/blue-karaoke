"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { Spotlight } from "@/components/ui/spotlight-new"
import { useAutoSync } from "@/hooks/useAutoSync"
import { UploadDialog } from "@/components/upload-dialog"
import { AtivacaoDialog } from "@/components/ativacao-dialog"
import { UnifiedSearch } from "@/components/unified-search"
import { useAtivacao } from "@/hooks/use-ativacao"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfiguracoesDialog } from "@/components/configuracoes-dialog"
import { QrCodesHome } from "@/components/qr-code"
import { Calendar, Clock, AlertCircle, Ban, Download, Settings } from "lucide-react"

export default function HomePage() {
  const [codigo, setCodigo] = useState("")
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [ativacaoDialogOpen, setAtivacaoDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [openAtLogin, setOpenAtLoginState] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [blockDownloads, setBlockDownloads] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("blue-karaoke-download-blocked") === "1"
  })
  const router = useRouter()
  const { status: ativacaoStatus, verificar: verificarAtivacao } = useAtivacao()
  const acabouDeAtivarRef = useRef(false)

  // Verifica se está ativado para permitir downloads
  const isActivated = ativacaoStatus.ativada && !ativacaoStatus.expirada

  const toggleBlockDownloads = useCallback(() => {
    setBlockDownloads((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("blue-karaoke-download-blocked", next ? "1" : "0")
      }
      return next
    })
  }, [])
  
  // Sincronização para download offline (respeita "impedir download")
  const { 
    downloadMetadata, 
    downloadAllForOffline, 
    offline, 
    isDownloading, 
    isOnline,
    message: syncMessage 
  } = useAutoSync({ intervalMinutes: 30, isActivated, blockDownloads })

  // Listener para atalho de sincronização (tecla *)
  useEffect(() => {
    const handleCheckNewMusic = () => {
      console.log("Iniciando sincronização de metadados via atalho...")
      downloadMetadata()
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
  }, [downloadMetadata, downloadAllForOffline])

  // Verificar ativação ao carregar — não reabrir logo após ativação bem-sucedida
  useEffect(() => {
    if (ativacaoStatus.modo === "loading") return
    if (acabouDeAtivarRef.current) return

    if (!ativacaoStatus.ativada || ativacaoStatus.expirada) {
      setAtivacaoDialogOpen(true)
    }
  }, [ativacaoStatus])

  const handleAtivacaoSucesso = useCallback(async () => {
    acabouDeAtivarRef.current = true
    await verificarAtivacao()
    setAtivacaoDialogOpen(false)
    setTimeout(() => {
      acabouDeAtivarRef.current = false
    }, 3000)
  }, [verificarAtivacao])

  const handleSubmit = useCallback(async () => {
    // Verificar se está ativado antes de permitir uso
    if (ativacaoStatus.modo === "loading") {
      return // Aguardar verificação
    }
    
    if (!ativacaoStatus.ativada || ativacaoStatus.expirada) {
      setAtivacaoDialogOpen(true)
      return
    }

    if (isLoading || codigo.length !== 5) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/musica/${codigo}`)
      const data = await response.json()

      if (data.exists) {
        router.push(`/tocar/${codigo}`)
      } else {
        setError(true)
        setTimeout(() => {
          setCodigo("")
          setError(false)
          setIsLoading(false)
        }, 2000)
      }
    } catch (err) {
      console.error("[v0] Error fetching music:", err)
      setError(true)
      setTimeout(() => {
        setCodigo("")
        setError(false)
        setIsLoading(false)
      }, 2000)
    }
  }, [codigo, isLoading, router, ativacaoStatus])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Não bloquear se o usuário estiver digitando em um input, textarea ou seletor
      const target = e.target as HTMLElement
      const isInputElement = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]")
      
      // F12 = abrir Configurações (padrão do app)
      if (e.key === "F12") {
        e.preventDefault()
        setConfigDialogOpen(true)
        return
      }

      // Não bloquear se algum diálogo estiver aberto
      if (ativacaoDialogOpen || uploadDialogOpen || configDialogOpen || isInputElement) {
        return // Permitir entrada normal em inputs e diálogos
      }

      // Bloquear input se não estiver ativado
      if (!ativacaoStatus.ativada || ativacaoStatus.expirada) {
        if (e.key !== "Escape") {
          e.preventDefault()
        }
        if (e.key === "Enter" || (e.key >= "0" && e.key <= "9")) {
          setAtivacaoDialogOpen(true)
        }
        return
      }

      // Only accept numeric keys 0-9
      if (e.key >= "0" && e.key <= "9") {
        if (codigo.length < 5 && !error && !isLoading) {
          setCodigo((prev) => prev + e.key)
        }
        e.preventDefault()
      } 
      // Enter key submits when code is complete
      else if (e.key === "Enter" && codigo.length === 5 && !isLoading) {
        handleSubmit()
        e.preventDefault()
      } 
      // Backspace = limpar um dígito
      else if (e.key === "Backspace") {
        setCodigo((prev) => prev.slice(0, -1))
        setError(false)
        e.preventDefault()
      }
      // Delete = cancelar (limpar todo o código)
      else if (e.key === "Delete") {
        setCodigo("")
        setError(false)
        e.preventDefault()
      }
      else if (e.key === "*") {
        // Sincronizar apenas metadados
        window.dispatchEvent(new CustomEvent("checkNewMusic"))
        e.preventDefault()
      }
      // + = reiniciar (voltar à tela inicial)
      else if (e.key === "+") {
        router.push("/")
        e.preventDefault()
      }
      else if (e.key === "/") {
        setUploadDialogOpen(true)
        e.preventDefault()
      }
      // C = tocar música aleatória
      else if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        fetch("/api/musicas/aleatoria")
          .then((r) => r.json())
          .then((data: { codigo: string | null }) => {
            if (data.codigo) router.push(`/tocar/${data.codigo}`)
          })
          .catch(() => {})
      }
      else {
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [codigo, error, isLoading, handleSubmit, ativacaoStatus, ativacaoDialogOpen, uploadDialogOpen, configDialogOpen, router])

  // Electron: detectar ambiente e carregar "Iniciar com Windows"
  useEffect(() => {
    if (typeof window === "undefined") return
    setIsElectron(!!window.electron?.quit)
    if (!window.electron?.getOpenAtLogin) return
    window.electron.getOpenAtLogin().then(({ openAtLogin }) => setOpenAtLoginState(openAtLogin))
  }, [])
  const setOpenAtLogin = useCallback(async (value: boolean) => {
    if (typeof window === "undefined" || !window.electron?.setOpenAtLogin) return
    await window.electron.setOpenAtLogin!(value)
    setOpenAtLoginState(value)
  }, [])

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
          <div className="relative w-40 h-40">
            <Image
              src="/logo-white.png"
              alt="Blue Karaokê"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-pulse"
              priority
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
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <Image
            src="/logo-white.png"
            alt="Blue Karaokê"
            fill
            className="object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
            priority
          />
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 z-20 top-40 md:top-44 w-max bg-stone-100/90 backdrop-blur-sm shadow-md py-3 px-8 flex flex-wrap items-center gap-4 rounded-lg">
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
        {isElectron && (
          <>
            <button
              type="button"
              onClick={() => window.electron?.quit?.()}
              className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
              title="Fechar Programa (ESC)"
            >
              Fechar Programa (ESC)
            </button>
            <span className="text-stone-400 select-none">·</span>
            <button
              type="button"
              onClick={() => window.electron?.minimize?.()}
              className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
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
          className="text-lg text-stone-800 hover:text-stone-900 hover:underline cursor-pointer bg-transparent border-0 p-0 font-normal"
          title="Tocar música aleatória (C)"
        >
          Tocar música aleatória (C)
        </button>
      </div>

      {/* Status de Ativação no canto superior direito */}
      {ativacaoStatus.ativada && !ativacaoStatus.expirada && (
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
              {ativacaoStatus.modo === "offline" && " (offline)"}
            </span>
          </div>
        </div>
      )}

      {/* Barra inferior: busca + status + QR */}
      <div className="absolute bottom-0 left-0 right-0 z-10 min-h-72 bg-stone-100/90 backdrop-blur-sm flex items-center justify-between pl-0 pr-8 py-6 gap-8">
        {/* Esquerda: título, busca e instruções (input no start, sem espaço lateral) */}
        <div className="min-w-0 max-w-3xl space-y-4 flex-1 flex flex-col items-start pl-8">
          <h1 className="text-3xl md:text-4xl text-stone-900 font-semibold tracking-wide">
            {ativacaoStatus.tipo === "assinatura"
              ? "Busque por código, nome ou artista"
              : "Digite o código da música"}
          </h1>

          {ativacaoStatus.ativada &&
           !ativacaoStatus.expirada &&
           ativacaoStatus.tipo === "assinatura" ? (
            <UnifiedSearch />
          ) : (
            <div className="flex justify-start">
              <div
                className={`inline-flex gap-2 p-6 rounded-2xl bg-white/80 border border-stone-200 shadow-sm ${
                  !ativacaoStatus.ativada || ativacaoStatus.expirada
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                {[0, 1, 2, 3, 4].map((index) => {
                  const hasValue = codigo[index]
                  return (
                    <div
                      key={index}
                      className={`relative w-16 h-20 md:w-20 md:h-24 flex items-center justify-center rounded-xl transition-all duration-300 ${
                        error
                          ? "bg-red-100 border-2 border-red-500 animate-shake"
                          : hasValue
                            ? "bg-cyan-100 border-2 border-cyan-500 shadow-sm"
                            : "bg-stone-100 border-2 border-stone-300"
                      }`}
                    >
                      <span
                        className={`text-4xl md:text-5xl font-bold ${
                          hasValue ? "text-cyan-800" : "text-stone-500"
                        }`}
                      >
                        {codigo[index] || "•"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-700 text-base font-medium">Código inválido! Tente novamente.</p>
          )}

          <div className="space-y-0.5 text-stone-700 text-2xl">
            {ativacaoStatus.tipo === "assinatura" ? (
              <>
                <p>Digite o <span className="font-semibold text-stone-900">código</span> ou <span className="font-semibold text-stone-900">nome da música</span></p>
                <p className="text-stone-600">Pressione <span className="font-medium text-stone-800">Enter</span> ou clique no resultado</p>
              </>
            ) : (
              <>
                <p>Use as teclas <span className="font-semibold text-stone-900">0 - 9</span> para digitar</p>
                <p className="text-stone-600">Pressione <span className="font-medium text-stone-800">Enter</span> quando tiver 5 dígitos</p>
              </>
            )}
          </div>
        </div>

        {/* Centro da barra: dados do item selecionado (título, autor, código) — portal do UnifiedSearch */}
        {ativacaoStatus.ativada && !ativacaoStatus.expirada && ativacaoStatus.tipo === "assinatura" && (
          <div id="search-selected-center" className="flex-1 min-w-0 flex items-center justify-center px-4" />
        )}

        {/* Direita: status, download e QR (fixo no canto, como antes) */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {(syncMessage || isDownloading) ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border-2 border-stone-300 text-stone-800 shadow-sm">
              {isDownloading && (
                <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-xl text-stone-900">
                {isDownloading
                  ? `Baixando... (${offline.musicasOffline} de ${offline.totalMusicas || offline.musicasOffline + offline.musicasOnline || 0} músicas)`
                  : (syncMessage || "Sincronizando...")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white border-2 border-stone-300 text-stone-800 shadow-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                <span className={`text-xl font-medium ${isOnline ? "text-green-800" : "text-red-800"}`}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              {offline.musicasOffline > 0 && (
                <>
                  <span className="text-stone-400">|</span>
                  <span className="text-stone-600 text-xl">🎵 {offline.musicasOffline} músicas</span>
                </>
              )}
            </div>
          )}
          {isActivated && (
            <button
              type="button"
              onClick={toggleBlockDownloads}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xl font-medium transition-colors ${
                blockDownloads
                  ? "bg-amber-100 text-amber-900 border border-amber-500 hover:bg-amber-200"
                  : "bg-stone-200 text-stone-900 border border-stone-400 hover:bg-stone-300"
              }`}
              title={blockDownloads ? "Permitir novos downloads" : "Impedir novos downloads"}
            >
              {blockDownloads ? (
                <>
                  <Download className="h-5 w-5" aria-hidden />
                  Permitir download
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5" aria-hidden />
                  Impedir download
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* QR codes à direita da página, fora da barra branca (um acima do outro) */}
      <div className="absolute right-8 bottom-80 z-20">
        <QrCodesHome />
      </div>

      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      <AtivacaoDialog
        open={ativacaoDialogOpen}
        onOpenChange={setAtivacaoDialogOpen}
        onAtivacaoSucesso={handleAtivacaoSucesso}
      />
      <ConfiguracoesDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        openAtLogin={openAtLogin}
        setOpenAtLogin={setOpenAtLogin}
      />
    </main>
  )
}
