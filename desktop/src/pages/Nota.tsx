import { useEffect, useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Lottie from "lottie-react"
import { useFilaProxima } from "@/contexts/fila-proxima"

export default function NotaPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { popFila } = useFilaProxima()
  const notaFinal = Number.parseInt(searchParams.get("nota") || "85")
  const proximoCodigo = searchParams.get("proximo") ?? null

  const [showCelebration, setShowCelebration] = useState(true)
  const [showNota, setShowNota] = useState(false)
  const [displayNota, setDisplayNota] = useState(0)
  const [countdown, setCountdown] = useState(10)
  const [celebrationData, setCelebrationData] = useState<object | null>(null)

  // Carregar animação Lottie
  useEffect(() => {
    fetch("/celebrations.json")
      .then(res => res.json())
      .then(data => setCelebrationData(data))
      .catch(err => {
        console.error("Erro ao carregar animação:", err)
        setShowCelebration(false)
        setShowNota(true)
      })
  }, [])

  // Mostrar nota após celebração (3 segundos)
  useEffect(() => {
    if (!celebrationData) return
    const timer = setTimeout(() => {
      setShowCelebration(false)
      setShowNota(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [celebrationData])

  // Animar nota subindo
  useEffect(() => {
    if (!showNota) return
    const duration = 1500
    const steps = 30
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
  }, [showNota, notaFinal])

  // Ao finalizar: ir para próxima música ou tela inicial
  const goAfterNota = useCallback(() => {
    if (proximoCodigo) {
      popFila()
      navigate(`/tocar/${proximoCodigo}`)
    } else {
      navigate("/")
    }
  }, [proximoCodigo, popFila, navigate])

  // Countdown para voltar
  useEffect(() => {
    if (!showNota) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => goAfterNota(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showNota, goAfterNota])

  // Handler para tecla Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        goAfterNota()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goAfterNota])

  const getMessage = () => {
    if (notaFinal >= 90) return "🎉 INCRÍVEL!"
    if (notaFinal >= 80) return "🌟 MUITO BOM!"
    if (notaFinal >= 70) return "👏 BOM TRABALHO!"
    if (notaFinal >= 50) return "💪 CONTINUE PRATICANDO!"
    return "🎤 TENTE NOVAMENTE!"
  }

  const getStars = () => {
    if (notaFinal >= 90) return 5
    if (notaFinal >= 80) return 4
    if (notaFinal >= 70) return 3
    if (notaFinal >= 50) return 2
    return 1
  }

  return (
    <main className="fixed inset-0 min-h-screen h-screen max-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-purple-950/40 to-black relative overflow-hidden">
      {/* Animação de celebração (Lottie) */}
      {showCelebration && celebrationData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <Lottie
            animationData={celebrationData}
            loop={false}
            autoplay={true}
            style={{ width: "100vw", height: "100vh" }}
          />
        </div>
      )}

      {/* Conteúdo principal */}
      <div
        className={`relative z-10 text-center space-y-6 transition-all duration-500 ${
          showNota ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          {getMessage()}
        </h1>

        <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`text-4xl ${
                i < getStars()
                  ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                  : "text-white/20"
              }`}
            >
              ★
            </span>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-xl text-white/60 mb-2">Sua pontuação</p>
          <div
            className={`text-[10rem] md:text-[14rem] font-black leading-none ${
              notaFinal >= 80
                ? "bg-gradient-to-br from-green-400 to-cyan-400"
                : notaFinal >= 60
                ? "bg-gradient-to-br from-yellow-400 to-orange-400"
                : "bg-gradient-to-br from-red-400 to-pink-400"
            } bg-clip-text text-transparent`}
          >
            {displayNota}
          </div>
          <p className="text-2xl text-white/30">/ 100</p>
        </div>

        <div className="mt-8 space-y-2">
          <div className="w-64 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
          <p className="text-sm text-white/40">
            {proximoCodigo ? (
              <>Próxima música em <span className="text-cyan-400">{countdown}s</span></>
            ) : (
              <>Voltando em <span className="text-cyan-400">{countdown}s</span></>
            )}
            {" • "}Pressione <span className="text-cyan-400">Enter</span>
          </p>
        </div>
      </div>
    </main>
  )
}
