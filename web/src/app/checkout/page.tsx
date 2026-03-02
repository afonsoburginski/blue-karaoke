"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react"
import { CheckCircle2, Loader2 } from "lucide-react"
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

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const userEmail = searchParams.get("email")
  const planIdParam = searchParams.get("planId")

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

  // Auto-selecionar plano quando vier da URL de cadastro
  useEffect(() => {
    if (!planIdParam || !plans.length || selectedPlan || !userId || !userEmail) return
    const match = plans.find((p) => p.id === planIdParam)
    if (match) handleSelectPlan(match)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, planIdParam, userId, userEmail])

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


  const isMobile = useIsMobile()

  const bg = (
    <div
      className="absolute inset-0 bg-cover bg-no-repeat"
      style={{ backgroundImage: `url('/images/karaoke-bg.jpg')`, backgroundPosition: "center center" }}
    />
  )

  const stepIndicator = (
    <div className={`flex items-center justify-center gap-${isMobile ? "2" : "3"} mb-2`}>
      <div className="flex items-center gap-2">
        <div className={`${isMobile ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm"} rounded-full bg-white/20 text-white/50 font-bold flex items-center justify-center`}>
          ✓
        </div>
        <span className={`text-white/50 font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
          {isMobile ? "Conta" : "Criar conta"}
        </span>
      </div>
      <div className={`${isMobile ? "w-6" : "w-8"} h-px bg-white/30`} />
      <div className="flex items-center gap-2">
        <div className={`${isMobile ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm"} rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center`}>
          2
        </div>
        <span className={`text-white font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
          Pagamento
        </span>
      </div>
    </div>
  )

  if (!userId || !userEmail) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden">
        {bg}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Redirecionando...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (isSuccess) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden">
        {bg}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
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
              <Button disabled className="w-full" size="lg">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecionando...
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {bg}

      <div className={`relative z-10 flex min-h-screen items-start justify-center ${isMobile ? "px-4 pt-10 pb-8" : "px-6 pt-12 pb-10"}`}>
        <div className={`w-full ${isMobile ? "max-w-sm space-y-3" : "max-w-xl space-y-4"}`}>

          {stepIndicator}

          {isLoadingPlans ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Carregando planos...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? "ring-2 ring-cyan-500 border-cyan-500"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => !isLoading && handleSelectPlan(plan)}
                >
                  <CardContent className={isMobile ? "p-4" : "pt-5 pb-5 px-5"}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${isMobile ? "text-base" : "text-lg"} mb-0.5`}>{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{plan.description}</p>
                        <div className="flex items-baseline gap-1">
                          <span className={`font-bold ${isMobile ? "text-xl" : "text-2xl"}`}>
                            R$ {(plan.price / 100).toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /{plan.period === "mensal" ? "mês" : plan.period === "trimestral" ? "trimestre" : "ano"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                        disabled={isLoading}
                        size="sm"
                        className={selectedPlan?.id === plan.id ? "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" : ""}
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
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {selectedPlan && cardInitialization && (
            <Card>
              <CardHeader className={isMobile ? "px-4 pt-4 pb-2" : ""}>
                <CardTitle className="text-lg">Finalizar pagamento</CardTitle>
                <CardDescription>
                  {selectedPlan.name} — R$ {(selectedPlan.price / 100).toFixed(2).replace(".", ",")}
                </CardDescription>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMobile ? "px-4 pb-4" : ""}`}>
                <div className="min-h-[400px]">
                  <CardPayment
                    initialization={cardInitialization}
                    onSubmit={handleCardPayment}
                    customization={{
                      visual: { style: { theme: "default" } },
                      paymentMethods: { types: { included: ["credit_card"] } },
                    }}
                    locale="pt-BR"
                  />
                </div>
                {isLoadingPayment && (
                  <div className="text-center py-6">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">Processando pagamento...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isLoading && !cardInitialization && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Preparando checkout...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url('/images/karaoke-bg.jpg')`, backgroundPosition: "center center" }}
        />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Carregando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
