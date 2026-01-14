"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { Spotlight } from "@/components/ui/spotlight-new"
import { QRCodeSVG } from "qrcode.react"
import { useAutoSync } from "@/hooks/useAutoSync"
import { UploadDialog } from "@/components/upload-dialog"
import { AtivacaoDialog } from "@/components/ativacao-dialog"
import { UnifiedSearch } from "@/components/unified-search"
import { useAtivacao } from "@/hooks/use-ativacao"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, AlertCircle } from "lucide-react"

export default function HomePage() {
  const [codigo, setCodigo] = useState("")
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [qrValue, setQrValue] = useState("https://bluekaraoke.com")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [ativacaoDialogOpen, setAtivacaoDialogOpen] = useState(false)
  const router = useRouter()
  const { status: ativacaoStatus, verificar: verificarAtivacao } = useAtivacao()
  
  // Verifica se está ativado para permitir downloads
  const isActivated = ativacaoStatus.ativada && !ativacaoStatus.expirada
  
  // Sincronização para download offline (só funciona se ativado)
  const { 
    downloadMetadata, 
    downloadAllForOffline, 
    offline, 
    isDownloading, 
    message: syncMessage 
  } = useAutoSync({ intervalMinutes: 30, isActivated })

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

  // Verificar ativação ao carregar
  useEffect(() => {
    if (ativacaoStatus.modo === "loading") {
      return
    }

    // Se não estiver ativado ou estiver expirado, mostrar diálogo
    if (!ativacaoStatus.ativada || ativacaoStatus.expirada) {
      setAtivacaoDialogOpen(true)
    }
  }, [ativacaoStatus])

  const handleAtivacaoSucesso = useCallback(() => {
    verificarAtivacao()
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
    // Set QR code value after hydration to avoid mismatch
    if (typeof window !== "undefined") {
      setQrValue(window.location.origin)
    }
  }, [])

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
      
      // Não bloquear se algum diálogo estiver aberto
      if (ativacaoDialogOpen || uploadDialogOpen || isInputElement) {
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
      // Backspace to delete
      else if (e.key === "Backspace") {
        setCodigo((prev) => prev.slice(0, -1))
        setError(false)
        e.preventDefault()
      }
      else if (e.key === "*") {
        // Sincronizar apenas metadados
        window.dispatchEvent(new CustomEvent("checkNewMusic"))
        e.preventDefault()
      }
      else if (e.key === "+") {
        // Baixar tudo para offline (metadados + arquivos)
        window.dispatchEvent(new CustomEvent("downloadAllOffline"))
        e.preventDefault()
      }
      else if (e.key === "/") {
        setUploadDialogOpen(true)
        e.preventDefault()
      }
      else {
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [codigo, error, isLoading, handleSubmit, ativacaoStatus, ativacaoDialogOpen, uploadDialogOpen])

  // Loading state
  if (ativacaoStatus.modo === "loading") {
    return (
      <main className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center">
        <div 
          className="absolute inset-0 blur-sm scale-105"
          style={{
            backgroundImage: `url('/images/karaoke-bg.jpg')`,
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
      {/* Imagem de fundo com blur */}
      <div 
        className="absolute inset-0 blur-sm scale-105"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Overlay escuro para melhor legibilidade */}
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

      {/* Status de Ativação no canto superior direito */}
      {ativacaoStatus.ativada && !ativacaoStatus.expirada && (
        <div className="absolute top-8 right-8 z-20 px-4">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {ativacaoStatus.diasRestantes !== null ? (
              <Calendar className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            )}
            <span className="text-cyan-400 text-sm md:text-base font-semibold">
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

      {/* Status de Sincronização no canto inferior esquerdo */}
      {(syncMessage || isDownloading) && (
        <div className="absolute bottom-8 left-8 z-20">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-cyan-400/30">
            {isDownloading && (
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
            <span className="text-cyan-400 text-sm">
              {syncMessage || "Sincronizando..."}
            </span>
          </div>
        </div>
      )}

      {/* Indicador de músicas offline */}
      {offline.musicasOffline > 0 && (
        <div className="absolute bottom-8 left-8 z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm">
            <span className="text-white/60 text-xs">
              🎵 {offline.musicasOffline} músicas offline
            </span>
          </div>
        </div>
      )}

      {/* QR Code no canto inferior direito */}
      <div className="absolute bottom-8 right-8 z-20">
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-cyan-400/30">
          <QRCodeSVG
            value={qrValue}
            size={120}
            level="H"
            includeMargin={false}
            fgColor="#1e1b4b"
            bgColor="#ffffff"
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="max-w-3xl w-full space-y-12">
          {/* Título */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl text-white/95 font-semibold tracking-wide">
              {/* 
                DIFERENCIAÇÃO POR TIPO DE CHAVE:
                - tipo "assinatura": Usuários que pagam assinatura (versão online com busca completa)
                - tipo "maquina": Máquinas de karaokê (versão offline, apenas código)
              */}
              {ativacaoStatus.tipo === "assinatura" 
                ? "Busque por código, nome ou artista" 
                : "Digite o código da música"}
            </h1>
            <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          </div>

          {/* 
            INTERFACE CONDICIONAL BASEADA NO TIPO DE CHAVE:
            - Assinantes (tipo "assinatura"): Input unificado que busca código OU nome/artista
            - Máquinas (tipo "maquina"): Apenas input de código (5 dígitos)
          */}
          {ativacaoStatus.ativada && 
           !ativacaoStatus.expirada && 
           ativacaoStatus.tipo === "assinatura" ? (
            <UnifiedSearch />
          ) : (
            <div className="flex justify-center">
              <div className={`inline-flex gap-3 p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl ${
                (!ativacaoStatus.ativada || ativacaoStatus.expirada) && ativacaoStatus.modo !== "loading"
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}>
                {[0, 1, 2, 3, 4].map((index) => {
                  const hasValue = codigo[index]

                  return (
                    <div
                      key={index}
                      className={`relative w-16 h-20 md:w-20 md:h-24 flex items-center justify-center rounded-xl transition-all duration-300 ${
                        error
                          ? "bg-red-500/20 border-2 border-red-500 animate-shake"
                          : hasValue
                            ? "bg-cyan-400/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                            : "bg-white/5 border-2 border-white/20"
                      }`}
                    >
                      <span
                        className={`text-4xl md:text-5xl font-bold transition-all ${
                          hasValue ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-white/30"
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

          {/* Mensagem de erro */}
          {error && (
            <div className="text-center animate-pulse">
              <p className="text-red-400 text-xl font-medium">Código inválido! Tente novamente.</p>
            </div>
          )}

          {/* Instruções - condicionais por tipo de usuário */}
          <div className="text-center space-y-2">
            {ativacaoStatus.tipo === "assinatura" ? (
              <>
                <p className="text-white/60 text-lg">
                  Digite o <span className="text-cyan-400 font-semibold">código</span> ou <span className="text-cyan-400 font-semibold">nome da música</span>
                </p>
                <p className="text-white/40 text-sm">
                  Pressione <span className="text-cyan-400 font-semibold">Enter</span> ou clique no resultado
                </p>
              </>
            ) : (
              <>
                <p className="text-white/60 text-lg">
                  Use as teclas <span className="text-cyan-400 font-semibold">0 - 9</span> para digitar
                </p>
                <p className="text-white/40 text-sm">
                  Pressione <span className="text-cyan-400 font-semibold">Enter</span> quando tiver 5 dígitos
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      <AtivacaoDialog
        open={ativacaoDialogOpen}
        onOpenChange={setAtivacaoDialogOpen}
        onAtivacaoSucesso={handleAtivacaoSucesso}
      />
    </main>
  )
}
