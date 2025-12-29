import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { env } from "@/lib/env"
import { db } from "@/lib/db"
import { assinaturas, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN

const client = new MercadoPagoConfig({
  accessToken,
})

const payment = new Payment(client)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Verificar se é um evento de pagamento
    if (type === "payment") {
      const paymentId = data.id

      // Buscar informações do pagamento
      const paymentInfo = await payment.get({ id: paymentId })

      if (!paymentInfo) {
        return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 })
      }

      // Verificar status do pagamento
      if (paymentInfo.status === "approved") {
        const externalReference = paymentInfo.external_reference

        if (!externalReference) {
          return NextResponse.json({ error: "Referência externa não encontrada" }, { status: 400 })
        }

        try {
          const referenceData = JSON.parse(externalReference)
          const { userId, planId, period, expirationDate } = referenceData

          if (!userId || !planId || !period) {
            return NextResponse.json({ error: "Dados do pagamento incompletos" }, { status: 400 })
          }

          // Verificar se o usuário existe
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

          if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
          }

          // Verificar se já existe assinatura
          const [existingSubscription] = await db
            .select()
            .from(assinaturas)
            .where(eq(assinaturas.userId, userId))
            .limit(1)

          const subscriptionData = {
            userId,
            plano: planId,
            status: "ativa",
            dataInicio: new Date(),
            dataFim: new Date(expirationDate),
            valor: paymentInfo.transaction_amount ? Math.round(paymentInfo.transaction_amount * 100) : 0,
            renovacaoAutomatica: true,
            updatedAt: new Date(),
          }

          if (existingSubscription) {
            // Atualizar assinatura existente
            await db
              .update(assinaturas)
              .set(subscriptionData)
              .where(eq(assinaturas.id, existingSubscription.id))
          } else {
            // Criar nova assinatura
            await db.insert(assinaturas).values(subscriptionData)
          }

          console.log(`✅ Assinatura criada/atualizada para usuário ${userId}`)

          return NextResponse.json({ success: true })
        } catch (parseError) {
          console.error("Erro ao processar referência externa:", parseError)
          return NextResponse.json(
            { error: "Erro ao processar dados do pagamento" },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Erro no webhook do Mercado Pago:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar webhook",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// GET para verificação do webhook (Mercado Pago pode fazer GET)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok" })
}

