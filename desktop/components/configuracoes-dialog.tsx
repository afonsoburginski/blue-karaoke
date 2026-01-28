"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"
import { RefreshCw } from "lucide-react"

interface ConfiguracoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Só no Electron */
  openAtLogin?: boolean
  setOpenAtLogin?: (value: boolean) => void
}

const comandos = [
  { tecla: "F12", acao: "Abrir configurações (padrão do app)" },
  { tecla: "Esc", acao: "Fechar programa" },
  { tecla: "Espaço", acao: "Minimizar programa" },
  { tecla: "C", acao: "Tocar música aleatória" },
  { tecla: "P", acao: "Pausar / retomar música (durante reprodução)" },
  { tecla: "+", acao: "Reiniciar música atual ou voltar à tela inicial" },
  { tecla: "Delete", acao: "Cancelar (limpar código / sair da música)" },
  { tecla: "Enter", acao: "Tocar (quando 5 dígitos) / Finalizar (segurar na reprodução)" },
  { tecla: "Backspace", acao: "Limpar um dígito" },
  { tecla: "0–9 durante a música", acao: "Digitar código para adicionar à fila “próxima”" },
]

export function ConfiguracoesDialog({
  open,
  onOpenChange,
  openAtLogin = false,
  setOpenAtLogin,
}: ConfiguracoesDialogProps) {
  const temElectron = typeof window !== "undefined" && window.electron?.getOpenAtLogin

  const handleSincronizar = () => {
    window.dispatchEvent(new CustomEvent("checkNewMusic"))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Configure o sistema e veja os atalhos de teclado disponíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {/* Iniciar com Windows */}
          {temElectron && setOpenAtLogin && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label htmlFor="config-open-at-login" className="text-base font-medium cursor-pointer">
                  Iniciar com Windows
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Abrir o Blue Karaoke automaticamente ao iniciar o Windows.
                </p>
              </div>
              <Switch
                id="config-open-at-login"
                checked={openAtLogin}
                onCheckedChange={setOpenAtLogin}
              />
            </div>
          )}

          {/* Sincronizar músicas */}
          <div className="rounded-lg border p-4">
            <p className="text-base font-medium mb-1">Sincronizar músicas</p>
            <p className="text-sm text-muted-foreground mb-3">
              Buscar novas músicas e atualizar o catálogo local.
            </p>
            <button
              type="button"
              onClick={handleSincronizar}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Sincronizar agora
            </button>
          </div>

          {/* Comandos e atalhos */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-base font-medium">Comandos e atalhos</p>
            <p className="text-sm text-muted-foreground">
              Teclas disponíveis na tela inicial e durante a reprodução.
            </p>
            <ul className="space-y-2.5 text-sm">
              {comandos.map(({ tecla, acao }) => (
                <li key={tecla} className="flex items-start gap-3">
                  <Kbd className="shrink-0 font-mono">{tecla}</Kbd>
                  <span className="text-muted-foreground">{acao}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              Durante a música, digite 5 dígitos para adicionar à fila; ao terminar a atual, a próxima toca automaticamente.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
