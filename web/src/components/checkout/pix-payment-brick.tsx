"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PixPaymentBrickProps {
  amount: number
  userId: string
  userEmail: string
  planId: string
  period: string
  onSuccess: (paymentId: string, qrCode: string, qrCodeBase64: string) => void
  onError: (error: string) => void
}

export function PixPaymentBrick({
  amount,
  userId,
  userEmail,
  planId,
  period,
  onSuccess,
  onError,
}: PixPaymentBrickProps) {
  const [loading, setLoading] = useState(false)

  const handleCreatePixPayment = async () => {
    setLoading(true)
    try {
      // Criar pagamento PIX diretamente no backend
      const res = await fetch("/api/mercadopago/bricks/process-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: { payment_method_id: "pix" },
          amount: amount / 100, // Converter centavos para reais
          userId,
          userEmail,
          planId,
          period,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erro desconhecido" }))
        // Se for erro de PIX não habilitado, mostrar mensagem específica
        if (errorData.errorCode === "PIX_NOT_ENABLED" || errorData.error?.includes("PIX não está disponível")) {
          throw new Error("PIX não está disponível no momento. Por favor, use cartão de crédito para pagar.")
        }
        throw new Error(errorData.error || errorData.details || "Erro ao criar pagamento PIX")
      }

      const data = await res.json()
      
      // Extrair QR Code do response
      let qrCode = data.qrCode || data.point_of_interaction?.transaction_data?.qr_code || ""
      let qrCodeBase64 = data.qrCodeBase64 || data.point_of_interaction?.transaction_data?.qr_code_base64 || ""
      
      // Se não tiver QR Code ainda, o pagamento foi criado mas precisa aguardar
      if (!qrCode && data.paymentId) {
        // Aguardar um pouco e tentar buscar novamente
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        try {
          const checkRes = await fetch(`/api/mercadopago/payment/${data.paymentId}`)
          if (checkRes.ok) {
            const checkData = await checkRes.json()
            qrCode = checkData.qrCode || ""
            qrCodeBase64 = checkData.qrCodeBase64 || ""
          }
        } catch (err) {
          console.error("Erro ao buscar QR Code:", err)
        }
      }
      
      if (qrCode) {
        onSuccess(data.paymentId || data.id || "", qrCode, qrCodeBase64)
      } else {
        throw new Error("QR Code não foi gerado. Tente novamente.")
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento PIX:", error)
      onError(error.message || "Erro ao processar pagamento PIX")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Criar pagamento PIX automaticamente quando o componente montar
    handleCreatePixPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#409fff]" />
        <p className="text-sm text-gray-300">Gerando QR Code PIX...</p>
      </div>
    )
  }

  return null
}
