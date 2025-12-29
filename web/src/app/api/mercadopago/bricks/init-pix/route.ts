import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig } from "mercadopago"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, preferenceId, userId, userEmail } = body

    if (!amount || !preferenceId || !userId || !userEmail) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      amount,
      payer: {
        email: userEmail,
      },
    })
  } catch (error: any) {
    console.error("Erro ao inicializar PIX Payment Brick:", error)
    return NextResponse.json(
      {
        error: "Erro ao inicializar pagamento PIX",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

