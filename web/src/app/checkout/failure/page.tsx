"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from "next/link"

const bg = (
  <div
    className="absolute inset-0 bg-cover bg-no-repeat"
    style={{ backgroundImage: `url('/images/karaoke-bg.jpg')`, backgroundPosition: "center center" }}
  />
)

function getErrorMessage(detail: string | null): string {
  if (!detail) return "Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente."
  if (detail.includes("cc_rejected_high_risk")) return "Pagamento recusado por segurança. Tente outro cartão ou entre em contato com seu banco."
  if (detail.includes("cc_rejected_bad_filled")) return "Dados do cartão incorretos. Verifique e tente novamente."
  if (detail.includes("cc_rejected_insufficient_amount") || detail.includes("insufficient_amount")) return "Saldo insuficiente no cartão. Verifique seu limite disponível."
  if (detail.includes("cc_rejected_card_disabled")) return "Cartão desabilitado. Entre em contato com seu banco."
  if (detail.includes("cc_rejected")) return "Seu cartão foi recusado. Verifique os dados ou tente com outro cartão."
  return "Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente."
}

function CheckoutFailureContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment_id")
  const status = searchParams.get("status")
  const detail = searchParams.get("detail")
  const userId = searchParams.get("userId")
  const userEmail = searchParams.get("email")

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {bg}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Pagamento não realizado</CardTitle>
            <CardDescription>{getErrorMessage(detail)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              </div>
            )}

            <div className="flex flex-col gap-2">
              {userId && userEmail ? (
                <Button asChild className="w-full">
                  <Link href={`/checkout?userId=${userId}&email=${encodeURIComponent(userEmail)}`}>
                    Tentar Novamente
                  </Link>
                </Button>
              ) : (
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
      </div>
    </main>
  )
}

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen w-full overflow-hidden">
        {bg}
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Carregando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    }>
      <CheckoutFailureContent />
    </Suspense>
  )
}
