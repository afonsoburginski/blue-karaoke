"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PaymentMethodSelector, PaymentMethodType } from "./payment-method-selector"
import { CardPaymentBrick } from "./card-payment-brick"
import { PixPaymentBrick } from "./pix-payment-brick"
import { PixQrCodeDisplay } from "./pix-qr-code-display"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { navigateFast } from "@/lib/navigation"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
}

interface CheckoutModalProps {
  plan: Plan
  isOpen: boolean
  onClose: () => void
}

export function CheckoutModal({ plan, isOpen, onClose }: CheckoutModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [pixData, setPixData] = useState<{
    qrCode: string
    qrCodeBase64: string
    paymentId?: string
  } | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef<boolean>(false)

  // Resetar estado quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null)
      setError(null)
      setPaymentSuccess(false)
      setPixData(null)
      setIsProcessing(false)
      // Limpar polling se existir
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      isPollingRef.current = false
    }
    
    // Cleanup quando componente desmontar
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      isPollingRef.current = false
    }
  }, [isOpen])

  // Verificar se usuário está logado
  useEffect(() => {
    if (isOpen && !user) {
      router.push("/login")
      onClose()
    }
  }, [isOpen, user, router, onClose])

  const handleSelectMethod = (method: PaymentMethodType) => {
    setSelectedMethod(method)
    setError(null)
  }

  const handleCardSuccess = (paymentId: string) => {
    setPaymentSuccess(true)
    setIsProcessing(false)
    setTimeout(() => {
      router.push(`/${user?.slug}?payment_success=true`)
      onClose()
    }, 2000)
  }

  const handleCardError = (errorMessage: string) => {
    setError(errorMessage)
    setIsProcessing(false)
  }

  const handlePixSuccess = (paymentId: string, qrCode: string, qrCodeBase64: string) => {
    setPixData({
      qrCode,
      qrCodeBase64,
      paymentId,
    })
    setIsProcessing(false)
    
    // Limpar polling anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    
    // Verificar status do pagamento periodicamente (apenas se necessário)
    if (paymentId) {
      let checkCount = 0
      const maxChecks = 40 // ~13 minutos (40 * 20 segundos)
      
      const checkPaymentStatus = async () => {
        if (!paymentId || paymentSuccess || !isPollingRef.current) return
        
        checkCount++
        try {
          const res = await fetch(`/api/mercadopago/payment/${paymentId}`)
          if (res.ok) {
            const data = await res.json()
            
            // Parar polling se pagamento foi aprovado, rejeitado ou cancelado
            if (data.status === "approved") {
              isPollingRef.current = false
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
              setPaymentSuccess(true)
              setTimeout(() => {
                navigateFast(router, `/${user?.slug}?payment_success=true`)
                onClose()
              }, 2000)
              return
            }
            
            // Parar polling se pagamento foi rejeitado ou cancelado
            if (data.status === "rejected" || data.status === "cancelled") {
              isPollingRef.current = false
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
              setError("Pagamento não foi aprovado. Tente novamente.")
              return
            }
            
            // Se status ainda for pending, continuar polling
            // Mas só se ainda não atingiu o máximo
            if (data.status === "pending" && checkCount >= maxChecks) {
              isPollingRef.current = false
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
            }
          }
        } catch (err) {
          console.error("Erro ao verificar pagamento:", err)
        }
      }
      
      // Verificar status inicial após 10 segundos (dar tempo para usuário escanear QR code)
      setTimeout(async () => {
        // Verificar uma vez antes de começar polling
        try {
          const res = await fetch(`/api/mercadopago/payment/${paymentId}`)
          if (res.ok) {
            const data = await res.json()
            // Se já estiver aprovado, não precisa fazer polling
            if (data.status === "approved") {
              setPaymentSuccess(true)
              setTimeout(() => {
                navigateFast(router, `/${user?.slug}?payment_success=true`)
                onClose()
              }, 2000)
              return
            }
            // Se foi rejeitado/cancelado, parar
            if (data.status === "rejected" || data.status === "cancelled") {
              setError("Pagamento não foi aprovado. Tente novamente.")
              return
            }
            // Se ainda estiver pending, iniciar polling
            if (data.status === "pending") {
              isPollingRef.current = true
              // Iniciar polling com intervalo maior (20 segundos para reduzir requisições)
              pollingIntervalRef.current = setInterval(checkPaymentStatus, 20000) // 20 segundos
            }
          }
        } catch (err) {
          console.error("Erro ao verificar status inicial:", err)
          // Em caso de erro, iniciar polling de qualquer forma
          isPollingRef.current = true
          pollingIntervalRef.current = setInterval(checkPaymentStatus, 20000)
        }
      }, 10000) // Aguardar 10 segundos antes da primeira verificação
    }
  }

  const handlePixError = (errorMessage: string) => {
    setError(errorMessage)
    setIsProcessing(false)
    // Se PIX não estiver disponível, sugerir cartão
    if (errorMessage.includes("PIX não está disponível") || errorMessage.includes("PIX não habilitado")) {
      // Opcional: auto-selecionar cartão após 3 segundos
      setTimeout(() => {
        if (!paymentSuccess && !selectedMethod) {
          setError(null)
          setSelectedMethod("card")
        }
      }, 3000)
    }
  }

  if (!isOpen || !user) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Finalizar Assinatura</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plano selecionado */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  R$ {(plan.price / 100).toFixed(2).replace(".", ",")}
                </div>
                <div className="text-sm text-gray-400">
                  /{plan.period === "mensal" ? "mês" : plan.period === "trimestral" ? "trimestre" : "ano"}
                </div>
              </div>
            </div>
          </div>

          {/* Mensagens de erro/sucesso */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {paymentSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Pagamento processado com sucesso! Redirecionando...</span>
            </div>
          )}

          {/* Seleção de método ou pagamento */}
          {!selectedMethod && !paymentSuccess && (
            <PaymentMethodSelector
              planPrice={plan.price}
              planName={plan.name}
              onSelectMethod={handleSelectMethod}
              selectedMethod={selectedMethod}
              isLoading={isProcessing}
            />
          )}

          {/* Pagamento com Cartão */}
          {selectedMethod === "card" && !paymentSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Pagamento com Cartão</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMethod(null)
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ← Voltar
                </Button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <CardPaymentBrick
                  amount={plan.price}
                  userId={user.id}
                  userEmail={user.email}
                  planId={plan.id}
                  period={plan.period}
                  onSuccess={handleCardSuccess}
                  onError={handleCardError}
                />
              </div>
            </div>
          )}

          {/* Pagamento PIX */}
          {selectedMethod === "pix" && !paymentSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Pagamento via PIX</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMethod(null)
                    setPixData(null)
                    setError(null)
                    // Limpar polling se existir
                    if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current)
                      pollingIntervalRef.current = null
                    }
                    isPollingRef.current = false
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ← Voltar
                </Button>
              </div>
              
              {error && error.includes("PIX não está disponível") && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-4 py-3 rounded-lg">
                  <p className="font-semibold mb-2">PIX não disponível</p>
                  <p className="text-sm mb-3">{error}</p>
                  <Button
                    onClick={() => {
                      setSelectedMethod("card")
                      setError(null)
                    }}
                    className="w-full bg-[#409fff] hover:bg-[#3090f0] text-white"
                  >
                    Usar Cartão de Crédito
                  </Button>
                </div>
              )}
              
              {pixData ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <PixQrCodeDisplay
                    qrCode={pixData.qrCode}
                    qrCodeBase64={pixData.qrCodeBase64}
                    amount={plan.price}
                    planName={plan.name}
                  />
                </div>
              ) : !error ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <PixPaymentBrick
                    amount={plan.price}
                    userId={user.id}
                    userEmail={user.email}
                    planId={plan.id}
                    period={plan.period}
                    onSuccess={handlePixSuccess}
                    onError={handlePixError}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
