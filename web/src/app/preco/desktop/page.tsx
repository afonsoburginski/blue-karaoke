"use client"

import { Header } from "@/components/header/desktop"
import { Check, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState, Suspense } from "react"
import { CheckoutModal } from "@/components/checkout/checkout-modal"
import { useAuth } from "@/hooks/use-auth"
import { useSearchParams } from "next/navigation"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  mercadoPagoId?: string
}

const features = [
  "Biblioteca completa de músicas",
  "Histórico de execuções",
  "Sincronização em nuvem",
  "Suporte prioritário",
  "Atualizações automáticas",
  "Multiplataforma",
]

function PrecoDesktopContent() {
  const { user, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutOpened, setCheckoutOpened] = useState(false)
  
  // Verificar se deve abrir checkout automaticamente
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
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [])

  // Efeito separado para abrir checkout quando usuário estiver logado
  useEffect(() => {
    // Aguardar autenticação carregar e planos estarem disponíveis
    if (authLoading || isLoading || checkoutOpened) return
    
    // Se houver planId na URL e deve abrir checkout, abrir automaticamente
    if (planIdFromUrl && shouldOpenCheckout && user) {
      const plan = plans.find((p: Plan) => p.id === planIdFromUrl)
      if (plan) {
        setSelectedPlan(plan)
        setIsCheckoutOpen(true)
        setCheckoutOpened(true)
        // Limpar URL params
        window.history.replaceState({}, "", "/preco")
      }
    }
  }, [planIdFromUrl, shouldOpenCheckout, user, authLoading, isLoading, plans, checkoutOpened])

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
    if (plan.period === "trimestral") {
      const monthlyPrice = plans.find((p) => p.period === "mensal")?.price || 0
      const savings = monthlyPrice * 3 - plan.price
      return savings > 0 ? savings : 0
    }
    if (plan.period === "anual") {
      const monthlyPrice = plans.find((p) => p.period === "mensal")?.price || 0
      const savings = monthlyPrice * 12 - plan.price
      return savings > 0 ? savings : 0
    }
    return 0
  }

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-10 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-0">
            Planos
          </h1>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="text-center text-gray-400 py-20">Carregando planos...</div>
          ) : (
            <div className={`grid gap-6 ${
              plans.length === 1 
                ? "grid-cols-1 max-w-md mx-auto" 
                : "grid-cols-1 md:grid-cols-3"
            }`}>
              {plans.map((plan) => {
                const savings = getSavings(plan)
                const isPopular = plan.period === "trimestral"

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white/5 backdrop-blur-sm border rounded-xl p-8 transition-all duration-300 ${
                      isPopular
                        ? "border-[#409fff] bg-white/10 scale-105"
                        : "border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-[#409fff] text-white text-xs font-medium px-3 py-1 rounded-full">
                          Mais Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                      <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">
                          R$ {formatPrice(plan.price)}
                        </span>
                        <span className="text-gray-400">/{getPeriodLabel(plan.period)}</span>
                      </div>
                      {savings > 0 && (
                        <p className="text-sm text-[#409fff] mt-2">
                          Economize R$ {formatPrice(savings)} em relação ao plano mensal
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-[#409fff] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => {
                        if (!user) {
                          // Redirecionar para cadastro com o plano selecionado
                          window.location.href = `/cadastro?planId=${plan.id}&redirect=checkout`
                          return
                        }
                        setSelectedPlan(plan)
                        setIsCheckoutOpen(true)
                      }}
                      className={`w-full ${
                        isPopular
                          ? "bg-[#409fff] hover:bg-[#3090f0] text-white"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      }`}
                    >
                      Assinar Agora
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[#409fff]/20 to-[#3090f0]/20 border border-[#409fff]/30 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Dúvidas sobre os planos?
            </h2>
            <p className="text-gray-300 mb-8">
              Fale diretamente conosco pelo WhatsApp
            </p>
            <div className="flex items-center justify-center gap-4">
              <a 
                href="https://wa.me/5566990019079?text=Olá! Gostaria de saber mais sobre os planos do Blue Karaokês" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-[#25D366] hover:bg-[#20BD5A] text-white px-8 gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Falar no WhatsApp
                </Button>
              </a>
              <Link href="/cadastro">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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

export default function PrecoDesktopPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black">
        <Header />
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-gray-400">Carregando planos...</p>
        </div>
      </main>
    }>
      <PrecoDesktopContent />
    </Suspense>
  )
}

