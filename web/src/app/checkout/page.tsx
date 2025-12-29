"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react"
import { CheckCircle2, Loader2, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  mercadoPagoId?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const userEmail = searchParams.get("email")

  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [cardInitialization, setCardInitialization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    // Se não tiver userId/userEmail nos params, tentar obter da sessão
    if (!userId || !userEmail) {
      const getSessionData = async () => {
        try {
          const sessionResponse = await authClient.getSession()
          const sessionUser = sessionResponse.data?.user
          if (sessionUser) {
            // Se tiver sessão, usar os dados da sessão
            const userSlug = (sessionUser as any).slug || createSlug(sessionUser.name || sessionUser.email.split("@")[0])
            const userRole = (sessionUser as any).role || "user"
            
            // Se for admin, redirecionar para dashboard
            if (userRole === "admin") {
              router.push(`/${userSlug}`)
              return
            }
            
            // Verificar se o usuário já tem assinatura ativa antes de mostrar checkout
            try {
              const subscriptionResponse = await fetch(`/api/assinaturas/check?userId=${sessionUser.id}`, {
                credentials: "include",
              })
              
              if (subscriptionResponse.ok) {
                const subscriptionData = await subscriptionResponse.json()
                
                // Se tiver assinatura ativa, redirecionar para o perfil (usuários não-admin só podem ver perfil)
                if (subscriptionData.hasSubscription && subscriptionData.subscription?.isActive === true) {
                  router.push(`/${userSlug}/perfil`)
                  return
                }
              }
            } catch (subErr) {
              console.error("Erro ao verificar assinatura:", subErr)
              // Em caso de erro na verificação, continuar mostrando checkout
            }
            
            // Se não tiver assinatura ativa, redirecionar para checkout com os dados da sessão
            router.push(`/checkout?userId=${sessionUser.id}&email=${encodeURIComponent(sessionUser.email)}`)
            return
          }
        } catch (err) {
          console.error("Erro ao buscar sessão:", err)
        }
        
        // Se não tiver sessão, redirecionar para login
        router.push("/login")
      }
      
      getSessionData()
    }
  }, [userId, userEmail, router])

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
        setPlans([
          {
            id: "mensal",
            name: "Plano Mensal",
            price: 2990,
            period: "mensal",
            description: "Acesso completo por 1 mês",
          },
        ])
      } finally {
        setIsLoadingPlans(false)
      }
    }

    if (userId && userEmail) {
      fetchPlans()
    }
  }, [userId, userEmail])

  useEffect(() => {
    // Usar public key do ambiente (.env.local = TESTE, .env = PRODUÇÃO)
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "TEST-a869d06f-27e9-483c-b6cd-abe00fece5dc"
    
    console.log("🔑 Public Key Mercado Pago:", publicKey.substring(0, 20) + "...", publicKey.startsWith("TEST") ? "(TESTE)" : "(PRODUÇÃO)")
    
    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" })
    }
  }, [])

  const handleSelectPlan = async (plan: Plan) => {
    if (!userId || !userEmail) return

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
          mercadoPagoId: plan.mercadoPagoId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || "Erro ao criar preferência de pagamento")
      }

      const data = await response.json()
      
      // Inicializar Card Payment Brick (sem preferenceId, seguindo o exemplo que funciona)
      const cardInitResponse = await fetch("/api/mercadopago/bricks/init-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: plan.price / 100,
          userId,
          userEmail,
          planId: plan.id,
          period: plan.period,
        }),
      })

      if (!cardInitResponse.ok) {
        throw new Error("Erro ao inicializar pagamento")
      }

      const cardData = await cardInitResponse.json()
      setCardInitialization(cardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardPayment = async (formData: any) => {
    if (!selectedPlan) return

    setIsLoadingPayment(true)
    setError(null)

    try {
      console.log("💳 Processando pagamento:", { 
        formData: {
          ...formData,
          token: formData.token?.substring(0, 20) + "...",
        }, 
        selectedPlan, 
        userId, 
        userEmail 
      })
      
      const response = await fetch("/api/mercadopago/bricks/process-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData,
          amount: selectedPlan.price / 100,
          userId,
          userEmail,
          planId: selectedPlan.id,
          period: selectedPlan.period,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Erro na resposta:", errorData)
        throw new Error(errorData.error || errorData.details || "Erro ao processar pagamento")
      }

      const data = await response.json()
      console.log("Resposta do pagamento:", data)
      
      // Aceitar approved, pending ou in_process como status válidos
      const isValidStatus = data.status === "approved" || data.status === "pending" || data.status === "in_process"
      
      if (isValidStatus) {
        console.log("Pagamento processado, criando assinatura...")
        setIsSuccess(true)
        
        // Redirecionar diretamente após 2 segundos (tempo para criar assinatura no backend)
        // O dashboard vai verificar a assinatura e permitir acesso se estiver ativa
        setTimeout(async () => {
          try {
            // Usar sessão do Better Auth diretamente
            const sessionResponse = await authClient.getSession()
            const sessionUser = sessionResponse.data?.user
            if (sessionUser) {
              const userSlug = (sessionUser as any).slug || createSlug(sessionUser.name || sessionUser.email.split("@")[0])
              // Redirecionar para o dashboard com parâmetro para evitar verificação
              router.push(`/${userSlug}?payment_success=true`)
              return
            }
          } catch (err) {
            console.error("Erro ao buscar sessão:", err)
          }
          
          // Fallback: redirecionar para página de sucesso
          router.push(`/checkout/success?payment_id=${data.paymentId}&status=${data.status}&userId=${userId}&email=${encodeURIComponent(userEmail || "")}`)
        }, 2000)
      } else {
        // Pagamento rejeitado ou falhou - redirecionar para página de falha
        setIsLoadingPayment(false)
        setError("Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente.")
        
        // Redirecionar para página de falha após 2 segundos
        setTimeout(() => {
          const params = new URLSearchParams({
            payment_id: data.paymentId?.toString() || "",
            status: data.status || "",
            detail: data.status_detail || "",
          })
          if (userId) params.set("userId", userId)
          if (userEmail) params.set("email", userEmail)
          
          router.push(`/checkout/failure?${params.toString()}`)
        }, 2000)
      }
    } catch (err) {
      console.error("Erro completo:", err)
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento")
      setIsLoadingPayment(false)
    }
  }


  if (!userId || !userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Redirecionando...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-500">
              Pagamento aprovado!
            </CardTitle>
            <CardDescription className="mt-2">
              Sua assinatura foi ativada com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              disabled
              className="w-full"
              size="lg"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecionando...
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Escolha seu plano
          </h1>
          <p className="text-sm text-gray-600">
            Pagamento por cartão de crédito
          </p>
        </div>

        {isLoadingPlans ? (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Carregando planos...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => !isLoading && handleSelectPlan(plan)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">
                          R$ {(plan.price / 100).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{plan.period === "mensal" ? "mês" : plan.period === "trimestral" ? "trimestre" : "ano"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                      disabled={isLoading}
                      size="sm"
                    >
                      {selectedPlan?.id === plan.id ? "Selecionado" : "Selecionar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {selectedPlan && cardInitialization && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finalizar pagamento</CardTitle>
              <CardDescription>
                {selectedPlan.name} - R$ {(selectedPlan.price / 100).toFixed(2).replace(".", ",")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NEXT_PUBLIC_NODE_ENV === "development" && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Modo de Teste - Cartões de Teste</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                        ⚠️ IMPORTANTE: Digite "APRO" no campo "Nome do portador" para aprovação em teste!
                      </div>
                      <div><strong>Mastercard:</strong> 5031 4332 1540 6351 | CVV: 123 | 11/30</div>
                      <div><strong>Visa:</strong> 4235 6477 2802 5682 | CVV: 123 | 11/30</div>
                      <div><strong>American Express:</strong> 3753 651535 56885 | CVV: 1234 | 11/30</div>
                      <div><strong>Elo Débito:</strong> 5067 7667 8388 8311 | CVV: 123 | 11/30</div>
                      <div className="mt-2 pt-2 border-t text-muted-foreground">
                        <strong>Nome do portador:</strong> APRO (obrigatório para aprovação)
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <div className="min-h-[400px]">
                <CardPayment
                  initialization={cardInitialization}
                  onSubmit={handleCardPayment}
                  customization={{
                    visual: {
                      style: {
                        theme: "default",
                      },
                    },
                    paymentMethods: {
                      types: {
                        included: ["credit_card"],
                      },
                    },
                  }}
                  locale="pt-BR"
                />
              </div>

              {isLoadingPayment && (
                <div className="text-center py-8">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Processando pagamento...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading && !cardInitialization && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">
              Preparando checkout...
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
