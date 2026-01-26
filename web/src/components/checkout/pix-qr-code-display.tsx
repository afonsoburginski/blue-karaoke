"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle2 } from "lucide-react"

interface PixQrCodeDisplayProps {
  qrCode: string
  qrCodeBase64?: string
  amount: number
  planName: string
}

export function PixQrCodeDisplay({
  qrCode,
  qrCodeBase64,
  amount,
  planName,
}: PixQrCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2).replace(".", ",")
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Escaneie o QR Code</h3>
        <p className="text-sm text-gray-300 mb-4">
          Use o app do seu banco para escanear e pagar
        </p>
      </div>

      {qrCodeBase64 && (
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-64 h-64"
            />
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Plano:</span>
          <span className="text-sm font-semibold text-white">{planName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Valor:</span>
          <span className="text-sm font-semibold text-white">R$ {formatPrice(amount)}</span>
        </div>
      </div>

      {qrCode && (
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Código PIX (copiar e colar):</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={qrCode}
              readOnly
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-xs text-blue-300 text-center">
          ⚠️ O pagamento pode levar alguns minutos para ser confirmado. Aguarde a confirmação.
        </p>
      </div>
    </div>
  )
}
