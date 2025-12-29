import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Preference } from "mercadopago"
import { env } from "@/lib/env"
import { getCurrentUser } from "@/lib/auth"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN

const getClient = () => new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
})


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, planName, price, period, userId, userEmail, mercadoPagoId } = body

    if (!planId || !price || !userId || !userEmail) {
      return NextResponse.json(
        { error: "Dados do plano são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar autenticação (opcional para novos usuários)
    const currentUser = await getCurrentUser()
    // Se não estiver autenticado mas tiver userId no body, permitir (novo cadastro)
    if (!currentUser && !userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }


    // Calcular data de expiração baseada no período
    const expirationDate = new Date()
    if (period === "mensal") {
      expirationDate.setMonth(expirationDate.getMonth() + 1)
    } else if (period === "trimestral") {
      expirationDate.setMonth(expirationDate.getMonth() + 3)
    } else if (period === "anual") {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1)
    }

    // Determinar URLs baseadas no ambiente
    const origin = process.env.CORS_ORIGIN || "http://localhost:3000"
    const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000/api"

    const successUrl = `${origin}/checkout/success`
    const failureUrl = `${origin}/checkout/failure`
    const pendingUrl = `${origin}/checkout/pending`

    // Criar preferência de pagamento
    const preferenceData: any = {
      items: [
        {
          id: planId,
          title: planName,
          description: `Assinatura ${planName} - Blue Karaoke`,
          quantity: 1,
          unit_price: price / 100,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: userEmail,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "bank_transfer" },
          { id: "atm" },
        ],
        excluded_payment_methods: [
          { id: "pec" },
          { id: "caixa" },
        ],
        installments: 12,
      },
      statement_descriptor: "BLUE KARAOKE",
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      external_reference: JSON.stringify({
        userId,
        planId,
        period,
        expirationDate: expirationDate.toISOString(),
      }),
      notification_url: `${apiBaseUrl}/webhook/mercadopago`,
      metadata: {
        userId,
        planId,
        period,
        price,
      },
    }

    const client = getClient()
    const preference = new Preference(client)
    const response = await preference.create({ body: preferenceData })

    return NextResponse.json({
      preferenceId: response.id,
      initPoint: response.init_point,
    })
  } catch (error: any) {
    console.error("Erro ao criar preferência do Mercado Pago:", error)
    console.error("Detalhes do erro:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data || error.cause,
    })
    return NextResponse.json(
      {
        error: "Erro ao criar preferência de pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

