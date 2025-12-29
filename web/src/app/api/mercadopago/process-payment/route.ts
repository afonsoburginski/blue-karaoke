import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { getCurrentUser } from "@/lib/auth"
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
    const { token, issuerId, paymentMethodId, installments, transactionAmount, description, payer, preferenceId } = body

    if (!token || !paymentMethodId || !transactionAmount || !payer?.email) {
      return NextResponse.json(
        { error: "Dados do pagamento incompletos" },
        { status: 400 }
      )
    }

    const client = getClient()
    const payment = new Payment(client)

    const paymentData: any = {
      transaction_amount: transactionAmount,
      token,
      description,
      installments: installments || 1,
      payment_method_id: paymentMethodId,
      issuer_id: issuerId,
      payer: {
        email: payer.email,
      },
    }

    const response = await payment.create({ body: paymentData })

    if (response.status === "approved" || response.status === "pending") {
      const externalReference = response.external_reference
      
      if (externalReference) {
        try {
          const referenceData = JSON.parse(externalReference)
          const { userId, planId, period, expirationDate } = referenceData

          if (userId && planId && period) {
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
              dataFim: new Date(expirationDate),
              valor: Math.round(transactionAmount * 100),
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
        } catch (err) {
          console.error("Erro ao processar referência externa:", err)
        }
      }
    }

    return NextResponse.json({
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
    })
  } catch (error: any) {
    console.error("Erro ao processar pagamento:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

