"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

interface ComandosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const comandos = [
  { tecla: "Delete", acao: "Cancelar (limpar código / sair da música)" },
  { tecla: "Enter", acao: "Tocar (quando 5 dígitos) / Finalizar (segurar na reprodução)" },
  { tecla: "Backspace", acao: "Limpar um dígito" },
  { tecla: "+", acao: "Reiniciar (voltar à tela inicial)" },
  { tecla: "Esc", acao: "Sair do aplicativo" },
  { tecla: "0–9 durante a música", acao: "Digitar código para adicionar à fila “próxima”" },
]

export function ComandosDialog({ open, onOpenChange }: ComandosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Comandos e atalhos</DialogTitle>
          <DialogDescription>
            Teclas disponíveis na tela inicial e durante a reprodução.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <ul className="space-y-3 text-sm">
            {comandos.map(({ tecla, acao }) => (
              <li key={tecla} className="flex items-start gap-3">
                <Kbd className="shrink-0 font-mono">{tecla}</Kbd>
                <span className="text-muted-foreground">{acao}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            Durante a música, digite 5 dígitos para adicionar à fila; ao terminar a atual, a próxima toca automaticamente.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
