"use client"

import { useEffect, useRef, useState, memo } from "react"
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react"
import { Loader2 } from "lucide-react"

// Inicializar Mercado Pago com a chave pública
const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ""

if (typeof window !== "undefined" && PUBLIC_KEY) {
  initMercadoPago(PUBLIC_KEY, { locale: "pt-BR" })
}

interface CardPaymentBrickProps {
  amount: number
  userId: string
  userEmail: string
  planId: string
  period: string
  onSuccess: (paymentId: string) => void
  onError: (error: string) => void
}

const CardPaymentBrickComponent = ({
  amount,
  userId,
  userEmail,
  planId,
  period,
  onSuccess,
  onError,
}: CardPaymentBrickProps) => {
  const [initialization, setInitialization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef<string | null>(null)

  // Criar uma chave única baseada nos parâmetros para evitar reinicializações desnecessárias
  const currentKey = `${planId}-${userId}-${amount}`

  useEffect(() => {
    // Se já foi inicializado com os mesmos parâmetros, não reinicializar
    if (initializedRef.current === currentKey && initialization) {
      return
    }

    // Se os parâmetros mudaram, resetar initialization
    if (initializedRef.current !== currentKey && initializedRef.current !== null) {
      setInitialization(null)
    }

    // Marcar como inicializando
    initializedRef.current = currentKey
    setLoading(true)

    // Buscar dados de inicialização do backend
    const fetchInitialization = async () => {
      try {
        const res = await fetch("/api/mercadopago/bricks/init-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount / 100, // Converter centavos para reais
            userId,
            userEmail,
            planId,
            period,
          }),
        })

        if (!res.ok) {
          throw new Error("Erro ao inicializar pagamento")
        }

        const data = await res.json()
        setInitialization(data)
      } catch (error: any) {
        console.error("Erro ao inicializar Card Payment Brick:", error)
        initializedRef.current = null // Permitir nova tentativa em caso de erro
        setInitialization(null)
        onError(error.message || "Erro ao inicializar pagamento")
      } finally {
        setLoading(false)
      }
    }

    fetchInitialization()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]) // Usar apenas a chave como dependência

  const onSubmit = async (formData: any) => {
    try {
      // Processar pagamento no backend
      const res = await fetch("/api/mercadopago/bricks/process-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          amount: amount / 100, // Converter centavos para reais
          userId,
          userEmail,
          planId,
          period,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erro ao processar pagamento")
      }

      const data = await res.json()
      onSuccess(data.paymentId || data.id || "")
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error)
      onError(error.message || "Erro ao processar pagamento")
    }
  }

  if (loading || !initialization) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#409fff]" />
      </div>
    )
  }

  return (
    <CardPayment
      initialization={initialization}
      onSubmit={onSubmit}
      customization={{
        visual: {
          style: {
            theme: "default",
          },
        },
        paymentMethods: {
          types: {
            included: ["credit_card"], // Apenas cartão de crédito
          },
        },
      }}
      locale="pt-BR"
    />
  )
}

// Memoizar o componente para evitar remontagens quando apenas referências mudam
export const CardPaymentBrick = memo(CardPaymentBrickComponent, (prevProps, nextProps) => {
  // Comparação customizada: só re-renderizar se props realmente mudaram
  return (
    prevProps.amount === nextProps.amount &&
    prevProps.planId === nextProps.planId &&
    prevProps.userId === nextProps.userId &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.period === nextProps.period
  )
})
