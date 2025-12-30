"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { Spotlight } from "@/components/ui/spotlight-new"
import { QRCodeSVG } from "qrcode.react"
import { useAutoSync } from "@/hooks/useAutoSync"
import { UploadDialog } from "@/components/upload-dialog"
import { AtivacaoDialog } from "@/components/ativacao-dialog"
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
  
  // Sincronização automática desabilitada em desenvolvimento
  // useAutoSync(30, false) // Desabilitado - só executa manualmente

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
        window.dispatchEvent(new CustomEvent("checkNewMusic"))
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
  }, [codigo, error, isLoading, handleSubmit, ativacaoStatus])

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      <Spotlight />

      {/* Logo no canto superior direito */}
      <div className="absolute top-8 right-8 z-20">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <Image
            src="/logo.png"
            alt="Blue Karaokê"
            fill
            className="object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]"
            priority
          />
        </div>
      </div>

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
          {/* Status de Ativação */}
          {ativacaoStatus.ativada && !ativacaoStatus.expirada && (
            <div className="flex justify-center">
              <Alert className="max-w-md border-green-500/50 bg-green-500/10">
                <div className="flex items-center gap-2">
                  {ativacaoStatus.diasRestantes !== null ? (
                    <Calendar className="h-4 w-4 text-green-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-green-400" />
                  )}
                  <AlertDescription className="text-green-300">
                    {ativacaoStatus.diasRestantes !== null
                      ? `${ativacaoStatus.diasRestantes} dias restantes`
                      : ativacaoStatus.horasRestantes !== null
                        ? `${Math.floor(ativacaoStatus.horasRestantes)} horas restantes`
                        : "Sistema ativado"}
                    {ativacaoStatus.modo === "offline" && " (modo offline)"}
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {/* Título */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl text-white/95 font-semibold tracking-wide">
              Digite o código da música
            </h1>
            <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          </div>

          {/* Input de código com 5 dígitos */}
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

          {/* Mensagem de erro */}
          {error && (
            <div className="text-center animate-pulse">
              <p className="text-red-400 text-xl font-medium">Código inválido! Tente novamente.</p>
            </div>
          )}

          {/* Instruções */}
          <div className="text-center space-y-2">
            <p className="text-white/60 text-lg">
              Use as teclas <span className="text-cyan-400 font-semibold">0 - 9</span> para digitar
            </p>
            <p className="text-white/40 text-sm">
              Pressione <span className="text-cyan-400 font-semibold">Enter</span> quando tiver 5 dígitos
            </p>
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
