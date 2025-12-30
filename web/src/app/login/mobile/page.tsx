"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header/mobile"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Preencher email se vier da URL (ex: quando usuário já existe no cadastro)
  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("Por favor, preencha todos os campos")
      return
    }

    setIsLoading(true)

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message || "Erro ao fazer login")
      }

      if (data?.user) {
        // Criar slug do nome do usuário
        const slug = createSlug(data.user.name || email.split("@")[0])
        
        // Salvar no localStorage para compatibilidade
        if (typeof window !== "undefined") {
          localStorage.setItem("userEmail", data.user.email)
          localStorage.setItem("userName", data.user.name || "")
          localStorage.setItem("userSlug", slug)
        }

        // Verificar role do usuário na sessão do Better Auth
        const userRole = (data.user as any).role || "user"

        // Se for admin, redirecionar direto para dashboard (não precisa de assinatura)
        if (userRole === "admin") {
          router.push(`/${slug}`)
          return
        }

        // Verificar se o usuário tem assinatura ativa (apenas para não-admin)
        try {
          const subscriptionResponse = await fetch(`/api/assinaturas/check?userId=${data.user.id}`, {
            credentials: "include",
          })
          
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            
            // Se tiver assinatura ativa, redirecionar para o perfil (usuários não-admin só podem ver perfil)
            if (subscriptionData.hasSubscription && subscriptionData.subscription?.isActive === true) {
              router.push(`/${slug}/perfil`)
              return
            }
            
            // Se não tiver assinatura ou não estiver ativa, redirecionar para checkout
            router.push(`/checkout?userId=${data.user.id}&email=${encodeURIComponent(data.user.email)}`)
            return
          }
        } catch (err) {
          console.error("Erro ao verificar assinatura:", err)
          router.push(`/${slug}/perfil`)
          return
        }

        // Fallback: se não conseguiu verificar, redirecionar para perfil
        router.push(`/${slug}/perfil`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login")
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
            <CardTitle className="text-xl font-bold">Entrar</CardTitle>
            <CardDescription className="text-sm">
              Digite suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="flex items-center justify-end">
                <Link
                  href="/recuperar-senha"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 px-4 pb-6">
              <Button
                type="submit"
                className="w-full h-10"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Não tem uma conta?{" "}
                <Link
                  href="/cadastro"
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre-se
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}

export default function LoginMobile() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center px-4 pt-6">
            <CardTitle className="text-xl">Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}

