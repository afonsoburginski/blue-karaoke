import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { db } from "@/lib/db"
import { assinaturas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

console.log("🔑 Token Mercado Pago usado:", accessToken.substring(0, 20) + "...", accessToken.startsWith("TEST") ? "(TESTE)" : "(PRODUÇÃO)")

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

    if (!formData || !formData.token || !amount || !userId || !userEmail) {
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

    // Log em modo de teste
    if (accessToken.startsWith("TEST")) {
      console.log("🧪 Modo de TESTE ativo - Dados do pagamento:", {
        amount,
        payment_method_id: formData.payment_method_id,
        installments: formData.installments,
        token: formData.token?.substring(0, 20) + "...",
        issuer_id: formData.issuer_id,
      })
    }

    const paymentData: any = {
      transaction_amount: amount,
      token: formData.token,
      description: `Assinatura ${planId} - Blue Karaoke`,
      installments: formData.installments || 1,
      payment_method_id: formData.payment_method_id,
      issuer_id: formData.issuer_id,
      payer: {
        email: userEmail,
        identification: formData.payer?.identification || undefined,
      },
      statement_descriptor: "BLUE KARAOKE",
      external_reference: JSON.stringify({
        userId,
        planId,
        period,
        expirationDate: expirationDate.toISOString(),
      }),
      // Campos adicionais para melhor compatibilidade
      capture: true,
      binary_mode: false,
    }

    // O nome do portador já está incluído no token gerado pelo CardPayment Brick
    // Não precisa ser enviado separadamente no paymentData

    const response = await payment.create({ body: paymentData })

    console.log("📊 Pagamento criado no Mercado Pago:", {
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
      payment_method_id: formData.payment_method_id,
      installments: formData.installments,
      amount,
      token_preview: formData.token?.substring(0, 20) + "...",
    })

    // Log detalhado em caso de rejeição em modo teste
    if (accessToken.startsWith("TEST") && response.status === "rejected") {
      console.error("❌ Pagamento REJEITADO em modo TESTE:", {
        status_detail: response.status_detail,
        causa: "Verifique se está usando cartão de teste válido e nome 'APRO'",
        cartoes_teste: [
          "Mastercard: 5031 4332 1540 6351",
          "Visa: 4235 6477 2802 5682",
        ],
      })
    }

    if (response.status === "approved" || response.status === "pending" || response.status === "in_process") {
      try {
        const [existingSubscription] = await db
          .select()
          .from(assinaturas)
          .where(eq(assinaturas.userId, userId))
          .limit(1)

        const subscriptionData = {
          userId,
          plano: planId || "mensal",
          status: (response.status === "approved") ? "ativa" : "pendente",
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
          console.log("Assinatura atualizada:", existingSubscription.id)
        } else {
          const [newSubscription] = await db.insert(assinaturas).values(subscriptionData).returning()
          console.log("Assinatura criada:", newSubscription?.id)
        }
      } catch (dbError: any) {
        console.error("Erro ao criar/atualizar assinatura:", dbError)
        // Não falhar o pagamento se houver erro no banco, mas logar o erro
      }
    }

    return NextResponse.json({
      paymentId: response.id?.toString(),
      status: response.status,
      status_detail: response.status_detail,
    })
  } catch (error: any) {
    console.error("Erro ao processar pagamento com cartão:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

