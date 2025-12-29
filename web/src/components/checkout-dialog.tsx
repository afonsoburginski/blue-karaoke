"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react"
import { CheckCircle2, X } from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number // em centavos
  period: string
  description: string
  mercadoPagoId?: string // ID do plano no Mercado Pago
}

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userEmail: string
  onSuccess?: () => void
}

export function CheckoutDialog({ open, onOpenChange, userId, userEmail, onSuccess }: CheckoutDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Buscar planos do Mercado Pago
  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true)
      try {
        const response = await fetch("/api/mercadopago/plans")
        if (!response.ok) {
          throw new Error("Erro ao buscar planos")
        }
        const data = await response.json()
        setPlans(data.plans || [])
      } catch (err) {
        console.error("Erro ao buscar planos:", err)
        // Usar planos padrão em caso de erro
        setPlans([
          {
            id: "mensal",
            name: "Plano Mensal",
            price: 2990,
            period: "mensal",
            description: "Acesso completo por 1 mês",
          },
          {
            id: "trimestral",
            name: "Plano Trimestral",
            price: 7990,
            period: "trimestral",
            description: "Acesso completo por 3 meses",
          },
          {
            id: "anual",
            name: "Plano Anual",
            price: 29990,
            period: "anual",
            description: "Acesso completo por 1 ano",
          },
        ])
      } finally {
        setIsLoadingPlans(false)
      }
    }

    if (open) {
      fetchPlans()
    }
  }, [open])

  // Inicializar Mercado Pago
  useEffect(() => {
    const publicKey = 
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
      (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) ||
      (process.env.NODE_ENV === "production" 
        ? "APP_USR-4dd8a23e-ea4a-47cf-baab-9a971aa00e3c"
        : "TEST-a869d06f-27e9-483c-b6cd-abe00fece5dc")
    
    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" })
    }
  }, [])

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan)
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          period: plan.period,
          userId,
          userEmail,
          mercadoPagoId: plan.mercadoPagoId, // ID do plano no Mercado Pago (se disponível)
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao criar preferência de pagamento")
      }

      const data = await response.json()
      setPreferenceId(data.preferenceId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = async (data?: any) => {
    console.log("Pagamento aprovado:", data)
    setIsSuccess(true)
    
    // Aguardar um pouco para o webhook processar
    setTimeout(async () => {
      // Verificar se a assinatura foi criada
      try {
        const checkResponse = await fetch(`/api/assinaturas/check?userId=${userId}`)
        if (checkResponse.ok) {
          const subscription = await checkResponse.json()
          if (subscription?.status === "ativa") {
            onSuccess?.()
            onOpenChange(false)
            setIsSuccess(false)
            setSelectedPlan(null)
            setPreferenceId(null)
            return
          }
        }
      } catch (err) {
        console.error("Erro ao verificar assinatura:", err)
      }
      
      // Se não encontrou, ainda assim redireciona (webhook pode processar depois)
      onSuccess?.()
      onOpenChange(false)
      setIsSuccess(false)
      setSelectedPlan(null)
      setPreferenceId(null)
    }, 3000)
  }

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Pagamento realizado com sucesso!
            </DialogTitle>
            <DialogDescription>
              Sua assinatura foi ativada. Redirecionando...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Não permitir fechar se já selecionou um plano e está processando
        if (!newOpen && (selectedPlan || isLoading)) {
          if (confirm("Tem certeza que deseja cancelar? Você precisará escolher um plano para continuar.")) {
            setSelectedPlan(null)
            setPreferenceId(null)
            setError(null)
            onOpenChange(false)
          }
        } else {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu plano de assinatura</DialogTitle>
          <DialogDescription>
            Para começar a usar o Blue Karaoke, escolha um dos planos abaixo. Você pode cancelar a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlans ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Carregando planos...
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-4 md:grid-cols-3">
            {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedPlan?.id === plan.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => handleSelectPlan(plan)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {(plan.price / 100).toFixed(2).replace(".", ",")}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  /{plan.period === "mensal" ? "mês" : plan.period === "trimestral" ? "trimestre" : "ano"}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {selectedPlan && preferenceId && (
          <div className="mt-4">
            <div className="mb-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Plano selecionado: {selectedPlan.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor: R$ {(selectedPlan.price / 100).toFixed(2).replace(".", ",")} / {selectedPlan.period === "mensal" ? "mês" : selectedPlan.period === "trimestral" ? "trimestre" : "ano"}
              </p>
            </div>
            <Wallet
              initialization={{ preferenceId }}
              customization={{
                texts: {
                  valueProp: "security_safety",
                },
              }}
              onSubmit={handleSuccess}
              onReady={(data) => {
                console.log("Wallet pronto:", data)
              }}
              onError={(error) => {
                console.error("Erro no Wallet:", error)
                setError("Erro ao processar pagamento. Por favor, tente novamente.")
              }}
            />
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparando checkout...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

