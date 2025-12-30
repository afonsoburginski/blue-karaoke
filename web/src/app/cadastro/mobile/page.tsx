"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header/mobile"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

export default function CadastroMobile() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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
                  router.push(`/checkout?userId=${loginResponse.data.user.id}&email=${encodeURIComponent(loginResponse.data.user.email)}`)
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
                    router.push(`/${slug}`)
                  } else {
                    router.push(`/${slug}/perfil`)
                  }
                  return
                }
              }
            }
          } catch (loginErr) {
            // Se não conseguir fazer login (senha errada), pedir para fazer login
            setError("Este email já está cadastrado. Faça login para continuar.")
            setTimeout(() => {
              router.push(`/login?email=${encodeURIComponent(formData.email)}`)
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
              const userRole = (loginResponse.data.user as any).role || "user"
              const slug = createSlug(loginResponse.data.user.name || formData.name)
              
              // Se for admin, redirecionar para dashboard
              if (userRole === "admin") {
                router.push(`/${slug}`)
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
                    router.push(`/${slug}/perfil`)
                    return
                  }
                }
              } catch (subErr) {
                console.error("Erro ao verificar assinatura:", subErr)
              }
              
              // Se não tiver assinatura ativa, redirecionar para checkout
              router.push(`/checkout?userId=${loginResponse.data.user.id}&email=${encodeURIComponent(loginResponse.data.user.email)}`)
              return
            }
          } catch (loginErr) {
            console.error("Erro ao fazer login:", loginErr)
            setError("Este email já está cadastrado. Faça login para continuar.")
            setTimeout(() => {
              router.push(`/login?email=${encodeURIComponent(formData.email)}`)
            }, 2000)
            return
          }
          
          return
        }
        throw new Error(authError.message || "Erro ao criar conta")
      }

      if (data?.user) {
        const slug = createSlug(data.user.name || formData.name)
        
        // Salvar no localStorage para compatibilidade
        if (typeof window !== "undefined") {
          localStorage.setItem("userEmail", data.user.email)
          localStorage.setItem("userName", data.user.name || formData.name)
          localStorage.setItem("userSlug", slug)
        }

        // Redirecionar para página de checkout
        router.push(`/checkout?userId=${data.user.id}&email=${encodeURIComponent(data.user.email)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-center"
        style={{
          backgroundImage: `url('/images/karaoke-bg.jpg')`,
          backgroundPosition: "center center",
        }}
      />

      <Header />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-16 pb-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1 px-4 pt-6">
            <CardTitle className="text-xl font-bold">Criar conta</CardTitle>
            <CardDescription className="text-sm">
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 px-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Senha</Label>
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
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  minLength={6}
                  className="h-10"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 px-4 pb-6">
              <Button
                type="submit"
                className="w-full h-10"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}

