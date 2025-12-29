"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Verificar se está em modo de desenvolvimento usando variável de ambiente
const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === "development"

function CheckoutFailureContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment_id")
  const status = searchParams.get("status")
  const detail = searchParams.get("detail")
  const userId = searchParams.get("userId")
  const userEmail = searchParams.get("email")
  
  // Mensagens específicas para diferentes tipos de rejeição
  const getErrorMessage = () => {
    if (detail?.includes("cc_rejected")) {
      return "Seu cartão foi rejeitado. Verifique os dados do cartão ou tente com outro cartão."
    }
    
    if (detail?.includes("insufficient_amount")) {
      return "Saldo insuficiente no cartão. Verifique seu limite disponível."
    }
    
    return "Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente."
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento não realizado</CardTitle>
          <CardDescription>
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Modo de Teste:</strong> Use um dos cartões de teste do Mercado Pago:
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="rounded bg-muted p-2">
                    <div className="font-medium">Mastercard</div>
                    <div className="font-mono text-xs">5031 4332 1540 6351</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="font-medium">Visa</div>
                    <div className="font-mono text-xs">4235 6477 2802 5682</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    CVV: <span className="font-mono">123</span> | Vencimento: <span className="font-mono">11/30</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {paymentId && (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
              <div>
                <p className="font-medium text-xs text-muted-foreground mb-1">ID do Pagamento</p>
                <p className="font-mono text-xs">{paymentId}</p>
              </div>
              {status && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-xs font-medium capitalize">{status}</p>
                </div>
              )}
              {detail && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Detalhes</p>
                  <p className="text-xs">{decodeURIComponent(detail)}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {userId && userEmail && (
              <Button asChild className="w-full">
                <Link href={`/checkout?userId=${userId}&email=${encodeURIComponent(userEmail)}`}>
                  Tentar Novamente
                </Link>
              </Button>
            )}
            {(!userId || !userEmail) && (
              <Button asChild className="w-full">
                <Link href="/checkout">Tentar Novamente</Link>
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Voltar ao Início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function CheckoutFailurePage() {
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
      <CheckoutFailureContent />
    </Suspense>
  )
}

