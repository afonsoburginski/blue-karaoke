"use client"

import Link from "next/link"
import { Header } from "@/components/header/mobile"
import {
  Mic,
  Monitor,
  Star,
  Zap,
  Headphones,
  Shield,
  ArrowRight,
  CheckCircle2,
  Check,
  Music,
  Globe,
  MessageCircle,
  Instagram,
  WifiOff,
  RefreshCw,
  Users,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { CheckoutModal } from "@/components/checkout/checkout-modal"
import { useAuth } from "@/hooks/use-auth"
import { useSearchParams } from "next/navigation"

const WHATSAPP_URL = "https://wa.me/5566999019079"
const INSTAGRAM_URL =
  "https://www.instagram.com/bluekaraokesinop?igsh=MWJjamM4YjFrbHp3MA%3D%3D"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  mercadoPagoId?: string
}

const planFeatures = [
  "Biblioteca completa de músicas",
  "Histórico de execuções",
  "Sincronização em nuvem",
  "Suporte prioritário",
  "Atualizações automáticas",
  "Multiplataforma",
]

const features = [
  {
    icon: Zap,
    title: "Entrega Imediata",
    description: "Acesso liberado automaticamente após o pagamento.",
  },
  {
    icon: Headphones,
    title: "Suporte Rápido",
    description: "Suporte dedicado via WhatsApp para tirar dúvidas.",
  },
  {
    icon: Shield,
    title: "Software Exclusivo",
    description: "Karaokê profissional com pontuação e catálogo completo.",
  },
  {
    icon: WifiOff,
    title: "100% Offline",
    description: "Funciona sem internet após sincronizar as músicas.",
  },
]

const steps = [
  {
    number: "01",
    title: "Assine um plano",
    description: "Pagamento rápido e seguro via PIX.",
    icon: Play,
  },
  {
    number: "02",
    title: "Baixe o app",
    description: "Instale no Windows ou Linux em minutos.",
    icon: Monitor,
  },
  {
    number: "03",
    title: "Comece a cantar",
    description: "Ative, sincronize e divirta-se!",
    icon: Mic,
  },
]

const testimonials = [
  {
    name: "Ricardo S.",
    role: "Dono de bar",
    text: "O melhor karaokê que já usei. Funciona offline e a pontuação é divertida!",
    rating: 5,
  },
  {
    name: "Fernanda M.",
    role: "Empresária",
    text: "Instalei no bar e os clientes adoraram. Suporte excelente!",
    rating: 5,
  },
  {
    name: "João P.",
    role: "Uso doméstico",
    text: "Perfeito para festas e reuniões em família. Prático e fácil de usar.",
    rating: 5,
  },
]

const stats = [
  { value: "5.000+", label: "Músicas" },
  { value: "100%", label: "Offline" },
  { value: "2", label: "Plataformas" },
  { value: "24h", label: "Suporte" },
]

export default function HomeMobile() {
  const { user, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutOpened, setCheckoutOpened] = useState(false)

  const planIdFromUrl = searchParams.get("planId")
  const shouldOpenCheckout = searchParams.get("checkout") === "true"

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/mercadopago/plans")
        if (response.ok) {
          const data = await response.json()
          setPlans(data.plans || [])
        }
      } catch (error) {
        console.error("Erro ao buscar planos:", error)
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [])

  useEffect(() => {
    if (authLoading || isLoadingPlans || checkoutOpened) return
    if (planIdFromUrl && shouldOpenCheckout && user) {
      const plan = plans.find((p: Plan) => p.id === planIdFromUrl)
      if (plan) {
        setSelectedPlan(plan)
        setIsCheckoutOpen(true)
        setCheckoutOpened(true)
        window.history.replaceState({}, "", "/")
      }
    }
  }, [planIdFromUrl, shouldOpenCheckout, user, authLoading, isLoadingPlans, plans, checkoutOpened])

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2).replace(".", ",")
  }

  const getPeriodLabel = (period: string) => {
    if (period === "mensal") return "mês"
    if (period === "trimestral") return "trimestre"
    if (period === "anual") return "ano"
    return period
  }

  const getSavings = (plan: Plan) => {
    const monthlyPrice = plans.find((p) => p.period === "mensal")?.price || 0
    if (plan.period === "trimestral") {
      const savings = monthlyPrice * 3 - plan.price
      return savings > 0 ? savings : 0
    }
    if (plan.period === "anual") {
      const savings = monthlyPrice * 12 - plan.price
      return savings > 0 ? savings : 0
    }
    return 0
  }

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      window.location.href = `/cadastro?planId=${plan.id}&redirect=checkout`
      return
    }
    setSelectedPlan(plan)
    setIsCheckoutOpen(true)
  }

  return (
    <main className="min-h-screen w-full bg-black text-white overflow-x-hidden">
      {/* Header */}
      <Header />

      {/* ======== HERO ======== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat bg-center scale-110"
          style={{ backgroundImage: `url('/images/karaoke-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 w-full px-5 pt-20 pb-16 text-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-cyan-400">
              <Music className="h-3.5 w-3.5" />
              <span>Karaokê Profissional</span>
            </div>

            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight">
              Todo dia é dia{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300">
                de cantar!
              </span>
            </h1>

            <p className="text-base text-white/60 leading-relaxed max-w-sm mx-auto">
              Sistema profissional com pontuação, catálogo completo e
              funcionamento 100% offline.
            </p>

            <div className="pt-2">
              <a href="#planos">
                <Button
                  size="lg"
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-base py-7 rounded-2xl shadow-lg shadow-cyan-500/30"
                >
                  Ver planos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======== STATS ======== */}
      <section className="border-y border-neutral-800 bg-neutral-950/80 py-8 px-5">
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-cyan-400">{s.value}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======== FEATURES ======== */}
      <section className="py-16 bg-neutral-950 px-5">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-medium tracking-wider uppercase text-xs mb-2">
            Vantagens
          </p>
          <h2 className="text-2xl font-bold">Por que escolher o Blue?</h2>
        </div>

        <div className="space-y-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======== COMO FUNCIONA ======== */}
      <section id="como-funciona" className="py-16 bg-black px-5 scroll-mt-16">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-medium tracking-wider uppercase text-xs mb-2">
            Simples e rápido
          </p>
          <h2 className="text-2xl font-bold">3 passos para começar</h2>
        </div>

        <div className="space-y-4">
          {steps.map((s) => (
            <div
              key={s.number}
              className="relative bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-neutral-400 text-sm">{s.description}</p>
              </div>
              <span className="text-3xl font-bold text-cyan-400/25 absolute top-3 right-4 select-none">
                {s.number}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ======== PLANOS ======== */}
      <section id="planos" className="py-16 bg-neutral-950 px-5 scroll-mt-16">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-medium tracking-wider uppercase text-xs mb-2">
            Planos e preços
          </p>
          <h2 className="text-2xl font-bold">Escolha seu plano</h2>
        </div>

        {isLoadingPlans ? (
          <div className="text-center text-neutral-400 py-8 text-sm">
            Carregando planos...
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const savings = getSavings(plan)
              const isPopular = plan.period === "trimestral"

              return (
                <div
                  key={plan.id}
                  className={`relative bg-neutral-900/50 border rounded-2xl p-6 transition-all ${
                    isPopular
                      ? "border-cyan-500 bg-neutral-900/80 shadow-lg shadow-cyan-500/10"
                      : "border-neutral-800"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                    <p className="text-xs text-neutral-400 mb-3">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        R$ {formatPrice(plan.price)}
                      </span>
                      <span className="text-neutral-500 text-sm">
                        /{getPeriodLabel(plan.period)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-cyan-400 mt-2">
                        Economize R$ {formatPrice(savings)}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {planFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-neutral-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-5 rounded-xl font-semibold ${
                      isPopular
                        ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    }`}
                  >
                    Assinar Agora
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-neutral-400 text-sm mb-3">
            Dúvidas sobre os planos?
          </p>
          <a
            href={`${WHATSAPP_URL}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre os planos do Blue Karaokês")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2 rounded-xl"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </a>
        </div>
      </section>

      {/* ======== HIGHLIGHTS ======== */}
      <section className="py-16 bg-black px-5">
        <p className="text-cyan-400 font-medium tracking-wider uppercase text-xs mb-2">
          Recursos
        </p>
        <h2 className="text-2xl font-bold mb-6">Tudo num único programa</h2>
        <ul className="space-y-4 mb-8">
          {[
            "Catálogo com milhares de músicas",
            "Pontuação em tempo real",
            "Funciona 100% offline",
            "Windows e Linux",
            "Atualizações automáticas",
            "Sincronização em nuvem",
          ].map((h) => (
            <li key={h} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-neutral-300 text-sm">{h}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Monitor, title: "Windows" },
            { icon: Globe, title: "Linux" },
            { icon: WifiOff, title: "Offline" },
            { icon: Mic, title: "Pontuação" },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-neutral-900/50 rounded-2xl p-5 text-center border border-neutral-800"
            >
              <item.icon className="h-7 w-7 text-cyan-400 mx-auto mb-2" />
              <p className="font-semibold text-sm">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======== DEPOIMENTOS ======== */}
      <section className="py-16 bg-neutral-950 px-5">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-medium tracking-wider uppercase text-xs mb-2">
            Depoimentos
          </p>
          <h2 className="text-2xl font-bold">O que dizem nossos clientes</h2>
        </div>

        <div className="space-y-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-neutral-300 text-sm mb-5 leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center text-cyan-400 font-semibold text-xs">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-neutral-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======== CTA FINAL ======== */}
      <section className="py-16 relative overflow-hidden px-5">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para cantar?</h2>
          <p className="text-neutral-400 text-sm mb-8">
            Escolha seu plano e comece a usar em minutos.
          </p>
          <div className="space-y-3">
            <a href="#planos">
              <Button
                size="lg"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-base py-7 rounded-2xl shadow-lg shadow-cyan-500/30"
              >
                Ver planos e preços
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/cadastro">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white/20 text-white hover:bg-white/10 text-base py-6 rounded-2xl mt-3"
              >
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="border-t border-neutral-800 bg-neutral-950 px-5 py-12">
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold mb-2">BLUE KARAOKÊS</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Programa de karaokê profissional com pontuação para Windows e
              Linux.
            </p>
            <div className="flex gap-3">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center"
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4 text-neutral-400" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center"
                title="Instagram"
              >
                <Instagram className="h-4 w-4 text-neutral-400" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-3 text-neutral-300">
                Produto
              </h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li>
                  <a href="#planos" className="hover:text-white">
                    Preços
                  </a>
                </li>
                <li>
                  <Link href="/catalogo" className="hover:text-white">
                    Catálogo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-neutral-300">
                Conta
              </h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li>
                  <Link href="/login" className="hover:text-white">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link href="/cadastro" className="hover:text-white">
                    Cadastre-se
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-neutral-300">
                Contato
              </h4>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-green-400"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-pink-400"
                  >
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800 mt-8 pt-6 text-center text-xs text-neutral-600">
          {new Date().getFullYear()} &copy; BLUE KARAOKÊS
        </div>
      </footer>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false)
            setSelectedPlan(null)
          }}
        />
      )}
    </main>
  )
}
