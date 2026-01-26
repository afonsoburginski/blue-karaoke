import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { env } from "@/lib/env"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN || ""

const getClient = () => new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const paymentId = id

    if (!paymentId) {
      return NextResponse.json(
        { error: "ID do pagamento não fornecido" },
        { status: 400 }
      )
    }

    const client = getClient()
    const payment = new Payment(client)

    const paymentInfo = await payment.get({ id: paymentId })

    if (!paymentInfo) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: paymentInfo.id?.toString(),
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      qrCode: paymentInfo.point_of_interaction?.transaction_data?.qr_code || "",
      qrCodeBase64: paymentInfo.point_of_interaction?.transaction_data?.qr_code_base64 || "",
      transaction_amount: paymentInfo.transaction_amount,
      date_created: paymentInfo.date_created,
      date_approved: paymentInfo.date_approved,
    })
  } catch (error: any) {
    console.error("Erro ao buscar pagamento:", error)
    return NextResponse.json(
      {
        error: "Erro ao buscar pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
