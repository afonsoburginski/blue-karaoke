"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { navigateFast } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header/desktop"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
}

function CadastroDesktopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("planId")
  const redirect = searchParams.get("redirect")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const translateAuthError = (msg: string): string => {
    const m = msg.toLowerCase()
    if (m.includes("password") && (m.includes("short") || m.includes("length")))
      return "A senha deve ter pelo menos 6 caracteres"
    if (m.includes("already exists") || m.includes("já existe") || m.includes("email taken"))
      return "Este email já está cadastrado. Faça login para continuar."
    if (m.includes("invalid email")) return "Email inválido"
    if (m.includes("invalid credentials") || m.includes("invalid password"))
      return "Senha incorreta"
    if (m.includes("user not found")) return "Usuário não encontrado"
    return msg
  }

  const isFormValid =
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 6 &&
    formData.confirmPassword === formData.password

  // Buscar info do plano se veio com planId
  useEffect(() => {
    if (!planId) return
    let cancelled = false
    fetch("/api/mercadopago/plans")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const plan = (data.plans || []).find((p: Plan) => p.id === planId)
        if (plan) setSelectedPlan(plan)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [planId])

  const isCheckoutFlow = !!planId && redirect === "checkout"

  const formatPrice = (price: number) =>
    (price / 100).toFixed(2).replace(".", ",")

  const getPeriodLabel = (period: string) => {
    if (period === "mensal") return "mês"
    if (period === "trimestral") return "trimestre"
    if (period === "anual") return "ano"
    return period
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setIsLoading(true)

    try {
      const { data, error: authError } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      })

      if (authError) {
        // Se o erro for de usuário já existente, verificar se precisa pagar e redirecionar
        if (authError.message?.includes("already exists") || authError.message?.includes("já existe") || authError.message?.includes("email")) {
          // Tentar fazer login automaticamente para verificar assinatura
          try {
            const loginResponse = await authClient.signIn.email({
              email: formData.email,
              password: formData.password,
            })

            if (loginResponse.data?.user) {
              // Verificar assinatura
              const subscriptionResponse = await fetch(`/api/assinaturas/check?userId=${loginResponse.data.user.id}`)
              if (subscriptionResponse.ok) {
                const subscriptionData = await subscriptionResponse.json()
                
                  // Se não tiver assinatura, ir direto para checkout
                  if (!subscriptionData.hasSubscription || !subscriptionData.subscription?.isActive) {
                    const slug = createSlug(loginResponse.data.user.name || formData.name)
                    if (typeof window !== "undefined") {
                      localStorage.setItem("userEmail", loginResponse.data.user.email)
                      localStorage.setItem("userName", loginResponse.data.user.name || formData.name)
                      localStorage.setItem("userSlug", slug)
                    }
                    navigateFast(router, `/checkout?userId=${loginResponse.data.user.id}&email=${encodeURIComponent(loginResponse.data.user.email)}${planId ? `&planId=${planId}` : ""}`)
                    return
                  } else {
                  // Se tiver assinatura, verificar role e redirecionar
                  const slug = createSlug(loginResponse.data.user.name || formData.name)
                  const userRole = (loginResponse.data.user as any).role || "user"
                  
                  if (typeof window !== "undefined") {
                    localStorage.setItem("userEmail", loginResponse.data.user.email)
                    localStorage.setItem("userName", loginResponse.data.user.name || formData.name)
                    localStorage.setItem("userSlug", slug)
                  }
                  
                  // Se for admin, ir para dashboard; se não, ir para perfil
                  if (userRole === "admin") {
                    navigateFast(router, `/${slug}`)
                  } else {
                    navigateFast(router, `/${slug}/perfil`)
                  }
                  return
                }
              }
            }
          } catch (loginErr) {
            // Se não conseguir fazer login (senha errada), pedir para fazer login
            setError("Este email já está cadastrado. Faça login para continuar.")
            setTimeout(() => {
              navigateFast(router, `/login?email=${encodeURIComponent(formData.email)}`)
            }, 2000)
            return
          }
          
          // Se chegou aqui, o email já existe - tentar fazer login
          setError("Este email já está cadastrado. Fazendo login...")
          
          try {
            const loginResponse = await authClient.signIn.email({
              email: formData.email,
              password: formData.password,
            })
            
            if (loginResponse.data?.user) {
              // Limpar sessões antigas após login bem-sucedido
              try {
                await fetch("/api/auth/cleanup-sessions", {
                  method: "POST",
                  credentials: "include",
                })
              } catch (cleanupError) {
                console.warn("Erro ao limpar sessões antigas (não crítico):", cleanupError)
              }

              const userRole = (loginResponse.data.user as any).role || "user"
              const slug = createSlug(loginResponse.data.user.name || formData.name)
              
              // Se for admin, redirecionar para dashboard
              if (userRole === "admin") {
                navigateFast(router, `/${slug}`)
                return
              }
              
              // Verificar se o usuário já tem assinatura ativa
              try {
                const subscriptionResponse = await fetch(`/api/assinaturas/check?userId=${loginResponse.data.user.id}`, {
                  credentials: "include",
                })
                
                if (subscriptionResponse.ok) {
                  const subscriptionData = await subscriptionResponse.json()
                  
                  // Se tiver assinatura ativa, redirecionar para o perfil
                  if (subscriptionData.hasSubscription && subscriptionData.subscription?.isActive === true) {
                    navigateFast(router, `/${slug}/perfil`)
                    return
                  }
                }
              } catch (subErr) {
                console.error("Erro ao verificar assinatura:", subErr)
              }
              
              navigateFast(router, `/checkout?userId=${loginResponse.data.user.id}&email=${encodeURIComponent(loginResponse.data.user.email)}${planId ? `&planId=${planId}` : ""}`)
              return
            }
          } catch (loginErr) {
            console.error("Erro ao fazer login:", loginErr)
            setError("Este email já está cadastrado. Faça login para continuar.")
            setTimeout(() => {
              navigateFast(router, `/login?email=${encodeURIComponent(formData.email)}`)
            }, 2000)
            return
          }
          
          return
        }
        throw new Error(translateAuthError(authError.message || "Erro ao criar conta"))
      }

      if (data?.user) {
        const slug = createSlug(data.user.name || formData.name)
        
        // Salvar no localStorage para compatibilidade
        if (typeof window !== "undefined") {
          localStorage.setItem("userEmail", data.user.email)
          localStorage.setItem("userName", data.user.name || formData.name)
          localStorage.setItem("userSlug", slug)
        }

        const checkoutUrl = `/checkout?userId=${data.user.id}&email=${encodeURIComponent(data.user.email)}${planId ? `&planId=${planId}` : ""}`
        navigateFast(router, checkoutUrl)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta"
      setError(translateAuthError(msg))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundPosition: "center center",
        }}
      />

      <Header />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-20 md:px-12 lg:px-20">
        <div className="w-full max-w-md space-y-4">
          {/* Step indicator quando vem do checkout */}
          {isCheckoutFlow && (
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-black text-sm font-bold flex items-center justify-center">
                  1
                </div>
                <span className="text-white font-medium text-sm">Criar conta</span>
              </div>
              <div className="w-8 h-px bg-white/30" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white/50 text-sm font-bold flex items-center justify-center">
                  2
                </div>
                <span className="text-white/50 text-sm">Pagamento</span>
              </div>
            </div>
          )}

          {/* Plano selecionado */}
          {isCheckoutFlow && selectedPlan && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">Plano selecionado</p>
                  <p className="font-semibold">{selectedPlan.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">R$ {formatPrice(selectedPlan.price)}</p>
                  <p className="text-xs text-white/60">/{getPeriodLabel(selectedPlan.period)}</p>
                </div>
              </div>
            </div>
          )}

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {isCheckoutFlow ? "Crie sua conta" : "Criar conta"}
            </CardTitle>
            <CardDescription>
              {isCheckoutFlow
                ? "Crie sua conta para finalizar a assinatura"
                : "Preencha os dados abaixo para criar sua conta"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button
                type="submit"
                className={`w-full ${isCheckoutFlow ? "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" : ""}`}
                disabled={isLoading || !isFormValid}
              >
                {isLoading
                  ? "Criando conta..."
                  : isCheckoutFlow
                    ? "Criar conta e continuar para pagamento"
                    : "Criar conta"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link
                  href={isCheckoutFlow ? `/login?planId=${planId}&redirect=checkout` : "/login"}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        </div>
      </div>
    </main>
  )
}

function CadastroDesktopFallback() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundPosition: "center center",
        }}
      />
      <Header />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-20 md:px-12 lg:px-20">
        <Card className="w-full max-w-md animate-pulse">
          <CardHeader className="space-y-1">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </CardContent>
          <CardFooter>
            <div className="h-10 w-full rounded bg-muted" />
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

export default function CadastroDesktopPage() {
  return (
    <Suspense fallback={<CadastroDesktopFallback />}>
      <CadastroDesktopContent />
    </Suspense>
  )
}

