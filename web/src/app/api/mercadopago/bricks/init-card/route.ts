import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig } from "mercadopago"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, userId, userEmail, planId, period } = body

    if (!amount || !userId || !userEmail) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    // Retornar dados de inicialização do CardPayment Brick
    return NextResponse.json({
      amount,
      payer: {
        email: userEmail,
      },
    })
  } catch (error: any) {
    console.error("Erro ao inicializar Card Payment Brick:", error)
    return NextResponse.json(
      {
        error: "Erro ao inicializar pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

