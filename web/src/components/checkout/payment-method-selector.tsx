"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, QrCode, Loader2 } from "lucide-react"

export type PaymentMethodType = "pix" | "card" | null

interface PaymentMethodSelectorProps {
  planPrice: number
  planName: string
  onSelectMethod: (method: PaymentMethodType) => void
  selectedMethod: PaymentMethodType
  isLoading?: boolean
}

export function PaymentMethodSelector({
  planPrice,
  planName,
  onSelectMethod,
  selectedMethod,
  isLoading = false,
}: PaymentMethodSelectorProps) {
  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2).replace(".", ",")
  }

  if (selectedMethod) {
    return null
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Escolha o método de pagamento:
      </h3>

      {/* PIX */}
      <button
        onClick={() => onSelectMethod("pix")}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-4 border-2 border-white/20 rounded-lg hover:border-[#409fff] hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#409fff]/20 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-[#409fff]" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">PIX</div>
            <div className="text-sm text-gray-300">Pagamento instantâneo</div>
            <div className="text-xs text-gray-400 mt-0.5">Valor: R$ {formatPrice(planPrice)}</div>
          </div>
        </div>
      </button>

      {/* Cartão de Crédito */}
      <button
        onClick={() => onSelectMethod("card")}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-4 border-2 border-white/20 rounded-lg hover:border-[#409fff] hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#409fff]/20 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#409fff]" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">Cartão de Crédito</div>
            <div className="text-sm text-gray-300">Assinatura recorrente</div>
            <div className="text-xs text-[#409fff] font-semibold mt-1">Pagamento seguro</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Valor: R$ {formatPrice(planPrice)}
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
