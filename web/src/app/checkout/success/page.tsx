"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment_id")
  const status = searchParams.get("status")
  const userId = searchParams.get("userId")
  const userEmail = searchParams.get("email")
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Se houver payment_id aprovado, redirecionar para o dashboard
    if (paymentId && status === "approved" && userId) {
      setIsRedirecting(true)
      
      // Usar sessão do Better Auth diretamente
      const redirectToDashboard = async () => {
        try {
          const { authClient } = await import("@/lib/auth-client")
          const { createSlug } = await import("@/lib/slug")
          const sessionResponse = await authClient.getSession()
          const sessionUser = sessionResponse.data?.user
          if (sessionUser) {
            const userSlug = (sessionUser as any).slug || createSlug(sessionUser.name || sessionUser.email.split("@")[0])
            router.push(`/${userSlug}?payment_success=true`)
            return
          }
        } catch (err) {
          console.error("Erro ao buscar sessão:", err)
        }
        
        // Fallback: redirecionar após 2 segundos
        setTimeout(() => {
          router.push(`/checkout?userId=${userId}&email=${encodeURIComponent(userEmail || "")}`)
        }, 2000)
      }
      
      // Aguardar um pouco antes de redirecionar
      setTimeout(redirectToDashboard, 1500)
    }
  }, [paymentId, status, userId, userEmail, router])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento realizado com sucesso!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada e você já pode começar a usar o Blue Karaoke.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentId && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">ID do Pagamento:</p>
              <p className="text-muted-foreground">{paymentId}</p>
            </div>
          )}
          {isRedirecting ? (
            <Button disabled className="w-full" size="lg">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecionando...
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href={localStorage.getItem("userSlug") ? `/${localStorage.getItem("userSlug")}` : "/"}>
                  Ir para o Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">Voltar ao Início</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

