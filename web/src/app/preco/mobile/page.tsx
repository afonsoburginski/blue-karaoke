"use client"

import { Header } from "@/components/header/mobile"
import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

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

export default function PrecoMobile() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      <section className="relative pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            Preços
          </h1>
          <p className="text-base text-gray-300 mb-6">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center text-gray-400 py-20 text-sm">Carregando planos...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {plans.map((plan) => {
                const savings = getSavings(plan)
                const isPopular = plan.period === "trimestral"

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white/5 backdrop-blur-sm border rounded-xl p-6 transition-all duration-300 ${
                      isPopular
                        ? "border-[#409fff] bg-white/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-[#409fff] text-white text-xs font-medium px-3 py-1 rounded-full">
                          Mais Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-5">
                      <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                      <p className="text-xs text-gray-400 mb-3">{plan.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          R$ {formatPrice(plan.price)}
                        </span>
                        <span className="text-gray-400 text-sm">/{getPeriodLabel(plan.period)}</span>
                      </div>
                      {savings > 0 && (
                        <p className="text-xs text-[#409fff] mt-2">
                          Economize R$ {formatPrice(savings)} em relação ao plano mensal
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#409fff] flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={`/checkout?planId=${plan.id}`} className="block">
                      <Button
                        className={`w-full ${
                          isPopular
                            ? "bg-[#409fff] hover:bg-[#3090f0] text-white"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        }`}
                      >
                        Assinar Agora
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[#409fff]/20 to-[#3090f0]/20 border border-[#409fff]/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-3">
              Dúvidas sobre os planos?
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Entre em contato conosco para mais informações
            </p>
            <Link href="/cadastro" className="w-full block">
              <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

