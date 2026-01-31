"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Calendar, Clock } from "lucide-react"
import { validarFormatoChave, normalizarChave } from "@/lib/utils/chave-ativacao"

interface AtivacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAtivacaoSucesso?: () => void
}

export function AtivacaoDialog({
  open,
  onOpenChange,
  onAtivacaoSucesso,
}: AtivacaoDialogProps) {
  const [chave, setChave] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!chave.trim()) {
      setError("Por favor, insira uma chave de ativação")
      return
    }

    // Validar formato antes de enviar
    const chaveNormalizada = normalizarChave(chave.trim())
    if (!validarFormatoChave(chaveNormalizada)) {
      setError("Formato de chave inválido. Use o formato: XXXX-XXXX-XXXX-XXXX")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/ativacao/validar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chave: chaveNormalizada }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Ocorreu um erro inesperado. Por favor, tente novamente." }))
        setError(errorData.error || "Não foi possível validar a chave. Tente novamente.")
        return
      }

      const resultado = await response.json()

      if (resultado.valida && resultado.chave) {
        setSuccess(true)
        setDiasRestantes(resultado.chave.diasRestantes)

        // Salvar no SQLite local (cópia do schema Supabase para uso offline)
        try {
          await fetch("/api/ativacao/salvar-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ valida: resultado.valida, chave: resultado.chave }),
          })
        } catch {
          // Não bloqueia: validação já foi no Supabase; local é cache
        }

        // Imediatamente notificar sucesso: parent atualiza estado e fecha diálogo (evita reabertura ao digitar)
        const result = onAtivacaoSucesso?.()
        if (result && typeof (result as Promise<unknown>).then === "function") {
          await (result as Promise<unknown>)
        }
        setChave("")
        setSuccess(false)
        setDiasRestantes(null)
      } else {
        setError(resultado.error || "Chave de ativação inválida. Verifique se digitou corretamente.")
      }
    } catch (err: any) {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
      setChave("")
      setError(null)
      setSuccess(false)
      setDiasRestantes(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ativação do Sistema</DialogTitle>
          <DialogDescription>
            Insira sua chave de ativação para usar o sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chave">Chave de Ativação</Label>
            <Input
              id="chave"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={chave}
              onChange={(e) => {
                setChave(e.target.value.toUpperCase())
                setError(null)
              }}
              onPaste={(e) => {
                e.preventDefault()
                const pastedText = e.clipboardData.getData("text")
                const normalized = normalizarChave(pastedText)
                setChave(normalized)
                setError(null)
              }}
              disabled={isLoading || success}
              className="font-mono text-center text-lg tracking-wider"
              maxLength={19} // XXXX-XXXX-XXXX-XXXX
            />
            <p className="text-xs text-muted-foreground">
              Formato: XXXX-XXXX-XXXX-XXXX
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="space-y-2">
                  <p className="font-semibold">Chave ativada com sucesso!</p>
                  {diasRestantes !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {diasRestantes > 0
                          ? `${diasRestantes} dias restantes`
                          : "Chave expirada"}
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || success || !chave.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                "Ativar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

