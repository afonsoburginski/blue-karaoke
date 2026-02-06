"use client"

import Link from "next/link"
import { Header } from "@/components/header/desktop"
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
    description:
      "Após a confirmação do pagamento, o acesso é liberado automaticamente no seu painel do cliente.",
  },
  {
    icon: Headphones,
    title: "Suporte Rápido",
    description:
      "Suporte dedicado via WhatsApp para resolver todas as suas dúvidas durante o uso do sistema.",
  },
  {
    icon: Shield,
    title: "Software Exclusivo",
    description:
      "Programa de karaokê profissional com pontuação, catálogo completo e atualização constante.",
  },
  {
    icon: WifiOff,
    title: "100% Offline",
    description:
      "Após sincronizar, funciona sem internet. Ideal para locais sem conexão estável.",
  },
  {
    icon: RefreshCw,
    title: "Atualizações Automáticas",
    description:
      "O app atualiza sozinho com novas músicas e melhorias. Sem complicação.",
  },
  {
    icon: Users,
    title: "Ideal para Bares e Festas",
    description:
      "Interface profissional pensada para uso comercial e doméstico.",
  },
]

const steps = [
  {
    number: "01",
    title: "Assine um plano",
    description:
      "Escolha o plano ideal para você e faça o pagamento via PIX de forma rápida e segura.",
    icon: Play,
  },
  {
    number: "02",
    title: "Baixe o aplicativo",
    description:
      "Instale o Blue Karaokê no seu computador Windows ou Linux em poucos minutos.",
    icon: Monitor,
  },
  {
    number: "03",
    title: "Comece a cantar",
    description:
      "Ative sua chave, sincronize as músicas e divirta-se com pontuação em tempo real!",
    icon: Mic,
  },
]

const testimonials = [
  {
    name: "Ricardo S.",
    role: "Dono de bar",
    text: "O melhor karaokê que já usei. Funciona offline, a pontuação é divertida e o catálogo é enorme! Os clientes amam.",
    rating: 5,
  },
  {
    name: "Fernanda M.",
    role: "Empresária",
    text: "Instalei no bar e os clientes adoraram. O suporte é excelente e sempre resolvem tudo rápido pelo WhatsApp.",
    rating: 5,
  },
  {
    name: "João P.",
    role: "Uso doméstico",
    text: "Muito prático! Funciona sem internet depois de sincronizar. Perfeito para festas e reuniões em família.",
    rating: 5,
  },
]

const stats = [
  { value: "5.000+", label: "Músicas disponíveis" },
  { value: "100%", label: "Funciona offline" },
  { value: "2", label: "Plataformas (Win/Linux)" },
  { value: "24h", label: "Suporte rápido" },
]

export default function HomeDesktop() {
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat bg-center scale-105"
          style={{ backgroundImage: `url('/images/karaoke-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-sm text-cyan-400">
              <Music className="h-4 w-4" />
              <span>Programa de Karaokê Profissional</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Todo dia é dia{" "}
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300">
                de cantar!
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              O Blue Karaokê é o sistema profissional com pontuação, catálogo
              completo e funcionamento 100% offline. Ideal para bares, festas e
              diversão em casa.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <a href="#planos">
                <Button
                  size="lg"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-lg px-10 py-7 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-400/40 hover:scale-[1.02]"
                >
                  Ver planos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <Link href="/catalogo">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-10 py-7 rounded-2xl backdrop-blur-sm"
                >
                  Ver catálogo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* ======== STATS BAR ======== */}
      <section className="border-y border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-cyan-400">
                  {s.value}
                </p>
                <p className="text-sm text-neutral-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== FEATURES ======== */}
      <section className="py-28 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-medium tracking-wider uppercase text-sm mb-3">
              Por que escolher o Blue Karaokê?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Tudo que você precisa para cantar
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 hover:border-cyan-500/30 hover:bg-neutral-900 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center mb-5 group-hover:from-cyan-500/30 group-hover:to-blue-500/20 transition-all">
                  <f.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== COMO FUNCIONA ======== */}
      <section id="como-funciona" className="py-28 bg-black relative overflow-hidden scroll-mt-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 relative z-10">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-medium tracking-wider uppercase text-sm mb-3">
              Simples e rápido
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              3 passos para começar
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div
                key={s.number}
                className="relative bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="h-7 w-7 text-cyan-400" />
                </div>
                <div className="text-5xl font-bold text-cyan-400/25 absolute top-4 right-6 select-none">
                  {s.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== PLANOS ======== */}
      <section id="planos" className="py-28 bg-neutral-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-medium tracking-wider uppercase text-sm mb-3">
              Planos e preços
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Escolha o plano ideal para você
            </h2>
          </div>

          {isLoadingPlans ? (
            <div className="text-center text-neutral-400 py-12">
              Carregando planos...
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                plans.length === 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : "grid-cols-1 md:grid-cols-3"
              }`}
            >
              {plans.map((plan) => {
                const savings = getSavings(plan)
                const isPopular = plan.period === "trimestral"

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-neutral-900/50 border rounded-2xl p-8 transition-all duration-300 ${
                      isPopular
                        ? "border-cyan-500 bg-neutral-900/80 scale-[1.03] shadow-lg shadow-cyan-500/10"
                        : "border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-cyan-500 text-black text-xs font-bold px-4 py-1.5 rounded-full">
                          Mais Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-neutral-400 mb-4">
                        {plan.description}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          R$ {formatPrice(plan.price)}
                        </span>
                        <span className="text-neutral-500">
                          /{getPeriodLabel(plan.period)}
                        </span>
                      </div>
                      {savings > 0 && (
                        <p className="text-sm text-cyan-400 mt-2">
                          Economize R$ {formatPrice(savings)}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {planFeatures.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3"
                        >
                          <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-neutral-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-6 rounded-xl text-base font-semibold transition-all ${
                        isPopular
                          ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25"
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

          {/* Dúvidas */}
          <div className="mt-16 text-center">
            <p className="text-neutral-400 mb-4">Dúvidas sobre os planos?</p>
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
        </div>
      </section>

      {/* ======== HIGHLIGHTS ======== */}
      <section className="py-28 bg-black">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-cyan-400 font-medium tracking-wider uppercase text-sm mb-3">
                Recursos
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Tudo num único programa
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-10">
                O Blue Karaokê reúne todas as funcionalidades que você precisa
                para animar qualquer evento. Profissional, confiável e fácil de
                usar.
              </p>
              <ul className="space-y-5">
                {[
                  "Catálogo com milhares de músicas",
                  "Pontuação em tempo real",
                  "Funciona 100% offline",
                  "Windows e Linux",
                  "Atualizações automáticas",
                  "Sincronização em nuvem",
                ].map((h) => (
                  <li key={h} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="text-neutral-300">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 rounded-3xl blur-2xl" />
              <div className="relative bg-neutral-900/80 rounded-3xl p-10 border border-neutral-800">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: Monitor, title: "Windows", sub: "Instalador NSIS" },
                    { icon: Globe, title: "Linux", sub: ".deb e .AppImage" },
                    { icon: WifiOff, title: "Offline", sub: "Sem internet" },
                    { icon: Mic, title: "Pontuação", sub: "Em tempo real" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="bg-neutral-800/50 rounded-2xl p-6 text-center border border-neutral-700/50 hover:border-cyan-500/20 transition-colors"
                    >
                      <item.icon className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {item.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======== DEPOIMENTOS ======== */}
      <section className="py-28 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16">
            <p className="text-cyan-400 font-medium tracking-wider uppercase text-sm mb-3">
              Depoimentos
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              O que dizem nossos clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 hover:border-neutral-700 transition-colors"
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-neutral-300 mb-8 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center text-cyan-400 font-semibold text-sm">
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
        </div>
      </section>

      {/* ======== CTA FINAL ======== */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para cantar?
          </h2>
          <p className="text-neutral-400 text-lg mb-12 max-w-xl mx-auto">
            Escolha seu plano, baixe o aplicativo e comece a usar em poucos
            minutos. Simples assim.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#planos">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-lg px-12 py-7 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-400/40 hover:scale-[1.02]"
              >
                Ver planos e preços
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/cadastro">
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-10 py-7 rounded-2xl"
              >
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ======== FOOTER ======== */}
      <footer className="border-t border-neutral-800 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <h3 className="text-lg font-bold mb-4">BLUE KARAOKÊS</h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                O programa de karaokê profissional com pontuação para Windows e
                Linux.
              </p>
              <div className="flex gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-green-600/20 border border-neutral-700 hover:border-green-500/30 flex items-center justify-center transition-all"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4 text-neutral-400" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-pink-600/20 border border-neutral-700 hover:border-pink-500/30 flex items-center justify-center transition-all"
                  title="Instagram"
                >
                  <Instagram className="h-4 w-4 text-neutral-400" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-neutral-300">
                Produto
              </h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li>
                  <a
                    href="#planos"
                    className="hover:text-white transition-colors"
                  >
                    Preços
                  </a>
                </li>
                <li>
                  <Link
                    href="/catalogo"
                    className="hover:text-white transition-colors"
                  >
                    Catálogo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-neutral-300">
                Conta
              </h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li>
                  <Link
                    href="/login"
                    className="hover:text-white transition-colors"
                  >
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cadastro"
                    className="hover:text-white transition-colors"
                  >
                    Cadastre-se
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-neutral-300">
                Contato
              </h4>
              <ul className="space-y-3 text-sm text-neutral-500">
                <li>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>(66) 99901-9079</span>
                  </a>
                </li>
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-pink-400 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>@bluekaraokesinop</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-12 pt-8 text-center text-sm text-neutral-600">
            {new Date().getFullYear()} &copy; BLUE KARAOKÊS. Todos os direitos
            reservados.
          </div>
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
