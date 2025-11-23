"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { Spotlight } from "@/components/ui/spotlight-new"
import { QRCodeSVG } from "qrcode.react"
import { useAutoSync } from "@/hooks/useAutoSync"
import { UploadDialog } from "@/components/upload-dialog"

export default function HomePage() {
  const [codigo, setCodigo] = useState("")
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [qrValue, setQrValue] = useState("https://bluekaraoke.com")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const router = useRouter()
  
  // Sincronização automática desabilitada em desenvolvimento
  // useAutoSync(30, false) // Desabilitado - só executa manualmente

  const handleSubmit = useCallback(async () => {
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
  }, [codigo, isLoading, router])

  useEffect(() => {
    // Set QR code value after hydration to avoid mismatch
    if (typeof window !== "undefined") {
      setQrValue(window.location.origin)
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
  }, [codigo, error, isLoading, handleSubmit])

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
          {/* Título */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl text-white/95 font-semibold tracking-wide">
              Digite o código da música
            </h1>
            <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          </div>

          {/* Input de código com 5 dígitos */}
          <div className="flex justify-center">
            <div className="inline-flex gap-3 p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl">
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
    </main>
  )
}
