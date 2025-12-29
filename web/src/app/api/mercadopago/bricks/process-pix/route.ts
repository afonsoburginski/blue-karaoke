import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { db } from "@/lib/db"
import { assinaturas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

const getClient = () => new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formData, amount, userId, userEmail, planId, period } = body

    if (!formData || !amount || !userId || !userEmail) {
      return NextResponse.json(
        { error: "Dados do pagamento incompletos" },
        { status: 400 }
      )
    }

    const client = getClient()
    const payment = new Payment(client)

    // Calcular data de expiração
    const expirationDate = new Date()
    if (period === "mensal") {
      expirationDate.setMonth(expirationDate.getMonth() + 1)
    } else if (period === "trimestral") {
      expirationDate.setMonth(expirationDate.getMonth() + 3)
    } else if (period === "anual") {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1)
    }

    const paymentData: any = {
      transaction_amount: amount,
      description: `Assinatura ${planId} - Blue Karaoke`,
      payment_method_id: formData.payment_method_id || "pix",
      payer: {
        email: userEmail,
      },
      external_reference: JSON.stringify({
        userId,
        planId,
        period,
        expirationDate: expirationDate.toISOString(),
      }),
    }

    const response = await payment.create({ body: paymentData })

    if (response.status === "approved" || response.status === "pending") {
      const [existingSubscription] = await db
        .select()
        .from(assinaturas)
        .where(eq(assinaturas.userId, userId))
        .limit(1)

      const subscriptionData = {
        userId,
        plano: planId,
        status: response.status === "approved" ? "ativa" : "pendente",
        dataInicio: new Date(),
        dataFim: expirationDate,
        valor: Math.round(amount * 100),
        renovacaoAutomatica: true,
        updatedAt: new Date(),
      }

      if (existingSubscription) {
        await db
          .update(assinaturas)
          .set(subscriptionData)
          .where(eq(assinaturas.id, existingSubscription.id))
      } else {
        await db.insert(assinaturas).values(subscriptionData)
      }
    }

    return NextResponse.json({
      paymentId: response.id?.toString(),
      status: response.status,
      status_detail: response.status_detail,
      qrCode: response.point_of_interaction?.transaction_data?.qr_code || "",
      qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64 || "",
    })
  } catch (error: any) {
    console.error("Erro ao processar pagamento PIX:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento PIX",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

