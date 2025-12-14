"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from 'next/navigation'

export default function NotaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const notaFinal = Number.parseInt(searchParams.get("nota") || "0")

  const [displayNota, setDisplayNota] = useState(0)
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    const duration = 2000
    const steps = 50
    const increment = notaFinal / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep <= steps) {
        setDisplayNota(Math.floor(increment * currentStep))
      } else {
        clearInterval(interval)
        setDisplayNota(notaFinal)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [notaFinal])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      router.push("/")
    }
  }, [countdown, router])

  const getMessage = () => {
    if (notaFinal >= 90) return "INCRÍVEL!"
    if (notaFinal >= 80) return "MUITO BOM!"
    if (notaFinal >= 70) return "BOM!"
    return "CONTINUE PRATICANDO!"
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-purple-950/30 to-black relative overflow-hidden">
      {/* Partículas de fundo animadas */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 100 + 50 + "px",
              height: Math.random() * 100 + 50 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              background:
                i % 2 === 0
                  ? "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)",
              animationDelay: Math.random() * 2 + "s",
              animationDuration: Math.random() * 3 + 2 + "s",
            }}
          />
        ))}
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 text-center space-y-12">
        {/* Mensagem de performance */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">
          {getMessage()}
        </h1>

        {/* Exibição da nota */}
        <div className="space-y-6">
          <p className="text-3xl text-white/90">Sua nota:</p>

          <div className="relative">
            <div className="text-[12rem] font-bold bg-gradient-to-br from-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(168,85,247,0.8)]">
              {displayNota}
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-4xl text-white/40">
              / 100
            </div>
          </div>
        </div>

        {/* Countdown para voltar */}
        <div className="mt-16 space-y-4">
          <div className="w-64 h-2 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000"
              style={{ width: `${(countdown / 8) * 100}%` }}
            />
          </div>
          <p className="text-xl text-white/60">Voltando ao início em {countdown}s</p>
        </div>
      </div>
    </main>
  )
}
