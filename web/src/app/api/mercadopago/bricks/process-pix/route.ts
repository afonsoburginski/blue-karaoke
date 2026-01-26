import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { db } from "@/lib/db"
import { assinaturas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Usar token do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

// Log para debug (apenas primeiros caracteres por segurança)
if (accessToken) {
  console.log("🔑 Mercado Pago Token:", accessToken.substring(0, 20) + "...", accessToken.startsWith("TEST") ? "(TESTE)" : accessToken.startsWith("APP_USR") ? "(PRODUÇÃO)" : "(DESCONHECIDO)")
}

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

    let response
    try {
      response = await payment.create({ body: paymentData })
    } catch (paymentError: any) {
      // Verificar se é erro de PIX não habilitado
      const errorMessage = paymentError?.message || paymentError?.error?.message || ""
      const errorString = JSON.stringify(paymentError).toLowerCase()
      const errorStatus = paymentError?.status || paymentError?.error?.status
      const errorType = paymentError?.error || paymentError?.error?.error
      
      // Verificar múltiplos indicadores de erro de PIX não habilitado
      const isPixNotEnabled = 
        errorMessage.includes("QR render") || 
        errorMessage.includes("key enabled") ||
        errorMessage.includes("without key enabled") ||
        errorMessage.includes("Collector user without key") ||
        errorMessage.includes("QR rendernull") ||
        errorString.includes("qr render") ||
        errorString.includes("key enabled") ||
        errorString.includes("without key enabled") ||
        errorString.includes("collector user without key") ||
        (errorStatus === 400 && errorType === "bad_request") ||
        errorType === "bad_request"
      
      if (isPixNotEnabled) {
        console.error("❌ PIX não habilitado na conta do Mercado Pago:", {
          message: errorMessage,
          status: errorStatus,
          error: errorType,
        })
        return NextResponse.json(
          {
            error: "PIX não está disponível no momento. Por favor, use cartão de crédito para pagar.",
            errorCode: "PIX_NOT_ENABLED",
            details: "A conta do Mercado Pago não possui PIX habilitado. Use cartão de crédito como alternativa.",
          },
          { status: 400 }
        )
      }
      // Re-throw outros erros para serem tratados no catch externo
      throw paymentError
    }

    if (response.status === "approved" || response.status === "pending") {
      try {
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
          console.log("✅ Assinatura atualizada:", existingSubscription.id)
        } else {
          await db.insert(assinaturas).values(subscriptionData)
          console.log("✅ Assinatura criada para usuário:", userId)
        }
      } catch (dbError: any) {
        // Se for erro de constraint única, tentar atualizar
        if (dbError?.code === "23505" || dbError?.message?.includes("duplicate key")) {
          console.log("⚠️ Assinatura já existe, tentando atualizar...")
          try {
            await db
              .update(assinaturas)
              .set({
                plano: planId,
                status: response.status === "approved" ? "ativa" : "pendente",
                dataInicio: new Date(),
                dataFim: expirationDate,
                valor: Math.round(amount * 100),
                renovacaoAutomatica: true,
                updatedAt: new Date(),
              })
              .where(eq(assinaturas.userId, userId))
            console.log("✅ Assinatura atualizada após erro de constraint")
          } catch (updateError) {
            console.error("❌ Erro ao atualizar assinatura:", updateError)
            // Não falhar o pagamento, apenas logar o erro
          }
        } else {
          console.error("❌ Erro ao criar/atualizar assinatura:", dbError)
          // Não falhar o pagamento se houver erro no banco, mas logar o erro
        }
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
    
    // Verificar se é erro de PIX não habilitado (pode vir no catch externo também)
    const errorMessage = error?.message || error?.error?.message || ""
    const errorString = JSON.stringify(error).toLowerCase()
    const errorStatus = error?.status || error?.error?.status
    const errorType = error?.error || error?.error?.error
    
    // Verificar múltiplos indicadores de erro de PIX não habilitado
    const isPixNotEnabled = 
      errorMessage.includes("QR render") || 
      errorMessage.includes("key enabled") ||
      errorMessage.includes("without key enabled") ||
      errorMessage.includes("Collector user without key") ||
      errorMessage.includes("QR rendernull") ||
      errorString.includes("qr render") ||
      errorString.includes("key enabled") ||
      errorString.includes("without key enabled") ||
      errorString.includes("collector user without key") ||
      (errorStatus === 400 && errorType === "bad_request") ||
      errorType === "bad_request"
    
    if (isPixNotEnabled) {
      console.error("❌ PIX não habilitado (catch externo):", {
        message: errorMessage,
        status: errorStatus,
        error: errorType,
      })
      return NextResponse.json(
        {
          error: "PIX não está disponível no momento. Por favor, use cartão de crédito para pagar.",
          errorCode: "PIX_NOT_ENABLED",
          details: "A conta do Mercado Pago não possui PIX habilitado. Use cartão de crédito como alternativa.",
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        error: "Erro ao processar pagamento PIX",
        details: error.message || "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

