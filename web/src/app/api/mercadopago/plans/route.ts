import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig } from "mercadopago"
import { env } from "@/lib/env"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN

const client = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Buscar planos de assinatura do Mercado Pago
    // A API do Mercado Pago usa o endpoint de preapproval_plan para listar planos
    const response = await fetch("https://api.mercadopago.com/preapproval_plan/search?status=active", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // Se não encontrar planos, retornar planos padrão
      console.warn("Não foi possível buscar planos do Mercado Pago, usando planos padrão")
      return NextResponse.json({
        plans: [
          {
            id: "mensal",
            name: "Plano Mensal",
            price: 2990,
            period: "mensal",
            description: "Acesso completo por 1 mês",
          },
          {
            id: "trimestral",
            name: "Plano Trimestral",
            price: 7990,
            period: "trimestral",
            description: "Acesso completo por 3 meses",
          },
          {
            id: "anual",
            name: "Plano Anual",
            price: 29990,
            period: "anual",
            description: "Acesso completo por 1 ano",
          },
        ],
      })
    }

    const data = await response.json()

    // Converter planos do Mercado Pago para nosso formato
    const plans = data.results?.map((plan: any) => {
      // Determinar período baseado no frequency e frequency_type
      let period = "mensal"
      if (plan.frequency === 3 && plan.frequency_type === "months") {
        period = "trimestral"
      } else if (plan.frequency === 12 && plan.frequency_type === "months") {
        period = "anual"
      } else if (plan.frequency === 1 && plan.frequency_type === "months") {
        period = "mensal"
      }

      return {
        id: plan.id?.toString() || plan.external_reference || `plan-${plan.id}`,
        name: plan.reason || `Plano ${period}`,
        price: Math.round((plan.auto_recurring?.transaction_amount || 0) * 100), // Converter para centavos
        period,
        description: plan.reason || `Acesso completo - ${period}`,
        mercadoPagoId: plan.id?.toString(),
      }
    }) || []

    // Se não houver planos, retornar planos padrão
    if (plans.length === 0) {
      return NextResponse.json({
        plans: [
          {
            id: "mensal",
            name: "Plano Mensal",
            price: 2990,
            period: "mensal",
            description: "Acesso completo por 1 mês",
          },
          {
            id: "trimestral",
            name: "Plano Trimestral",
            price: 7990,
            period: "trimestral",
            description: "Acesso completo por 3 meses",
          },
          {
            id: "anual",
            name: "Plano Anual",
            price: 29990,
            period: "anual",
            description: "Acesso completo por 1 ano",
          },
        ],
      })
    }

    return NextResponse.json({ plans })
  } catch (error: any) {
    console.error("Erro ao buscar planos do Mercado Pago:", error)
    
    // Retornar planos padrão em caso de erro
    return NextResponse.json({
      plans: [
        {
          id: "mensal",
          name: "Plano Mensal",
          price: 2990,
          period: "mensal",
          description: "Acesso completo por 1 mês",
        },
        {
          id: "trimestral",
          name: "Plano Trimestral",
          price: 7990,
          period: "trimestral",
          description: "Acesso completo por 3 meses",
        },
        {
          id: "anual",
          name: "Plano Anual",
          price: 29990,
          period: "anual",
          description: "Acesso completo por 1 ano",
        },
      ],
    })
  }
}

