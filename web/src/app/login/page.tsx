"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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

        router.push(`/${slug}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login")
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
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar sua conta
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-end">
                <Link
                  href="/recuperar-senha"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
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

