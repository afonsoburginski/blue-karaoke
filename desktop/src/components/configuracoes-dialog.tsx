import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { RefreshCw } from "lucide-react"

interface ConfiguracoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const comandosTelaInicial = [
  { tecla: "F12", acao: "Abrir configurações" },
  { tecla: "Esc", acao: "Fechar programa" },
  { tecla: "*", acao: "Baixar / sincronizar músicas (metadados + arquivos)" },
  { tecla: "0–9", acao: "Digitar código da música" },
  { tecla: "Enter", acao: "Tocar música (quando código com 5 dígitos)" },
  { tecla: "Backspace", acao: "Apagar um dígito do código" },
  { tecla: "Delete", acao: "Cancelar e limpar o código" },
  { tecla: "+", acao: "Voltar à tela inicial" },
  { tecla: "C", acao: "Tocar música aleatória" },
]

const comandosReproducao = [
  { tecla: "F12", acao: "Abrir configurações" },
  { tecla: "Esc", acao: "Fechar programa" },
  { tecla: "Delete", acao: "Sair da música e voltar à tela inicial" },
  { tecla: "+", acao: "Reiniciar música atual (voltar ao início)" },
  { tecla: "P", acao: "Pausar / retomar reprodução" },
  { tecla: "C", acao: "Tocar música aleatória" },
  { tecla: "Enter", acao: "Segurar para finalizar e voltar (ou confirmar busca)" },
  { tecla: "Backspace", acao: "Apagar caractere na busca" },
  { tecla: "0–9 e letras", acao: "Digitar na busca ou código para adicionar à fila \"próxima\"" },
]

export function ConfiguracoesDialog({
  open,
  onOpenChange,
}: ConfiguracoesDialogProps) {

  const handleSincronizar = () => {
    window.dispatchEvent(new CustomEvent("checkNewMusic"))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Configure o sistema e veja os atalhos de teclado disponíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
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

          {/* Mapa de teclas e atalhos */}
          <div className="rounded-lg border p-4 space-y-4">
            <p className="text-base font-medium">Teclas e atalhos</p>

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Tela inicial (busca)</p>
              <ul className="space-y-2 text-sm">
                {comandosTelaInicial.map(({ tecla, acao }) => (
                  <li key={tecla} className="flex items-start gap-3">
                    <Kbd className="shrink-0 font-mono text-xs">{tecla}</Kbd>
                    <span className="text-muted-foreground">{acao}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Durante a reprodução</p>
              <ul className="space-y-2 text-sm">
                {comandosReproducao.map(({ tecla, acao }) => (
                  <li key={tecla} className="flex items-start gap-3">
                    <Kbd className="shrink-0 font-mono text-xs">{tecla}</Kbd>
                    <span className="text-muted-foreground">{acao}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              Durante a música: digite 5 dígitos para adicionar à fila "próxima"; ao terminar a atual, a próxima toca automaticamente.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
