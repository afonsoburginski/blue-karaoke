import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

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
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "error">("idle")
  const [updateMessage, setUpdateMessage] = useState("")
  const [downloadProgress, setDownloadProgress] = useState(0)

  const handleSincronizar = () => {
    window.dispatchEvent(new CustomEvent("checkNewMusic"))
    onOpenChange(false)
  }

  const handleCheckUpdate = async () => {
    setUpdateStatus("checking")
    setUpdateMessage("Verificando atualizações...")
    try {
      const update = await check()
      if (update) {
        setUpdateStatus("available")
        setUpdateMessage(`Nova versão ${update.version} disponível!`)
      } else {
        setUpdateStatus("up-to-date")
        setUpdateMessage("Você já está na versão mais recente.")
      }
    } catch (err) {
      console.error("[Updater] Error:", err)
      setUpdateStatus("error")
      setUpdateMessage(`Erro ao verificar: ${err}`)
    }
  }

  const handleDownloadUpdate = async () => {
    setUpdateStatus("downloading")
    setUpdateMessage("Baixando atualização...")
    setDownloadProgress(0)
    try {
      const update = await check()
      if (!update) return

      let downloaded = 0
      let contentLength = 0
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0
            setUpdateMessage(`Baixando... 0%`)
            break
          case "Progress":
            downloaded += event.data.chunkLength
            const pct = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0
            setDownloadProgress(pct)
            setUpdateMessage(`Baixando... ${pct}%`)
            break
          case "Finished":
            setUpdateMessage("Atualização pronta! Reiniciando...")
            setUpdateStatus("ready")
            break
        }
      })

      // Relaunch the app after installation
      await relaunch()
    } catch (err) {
      console.error("[Updater] Download error:", err)
      setUpdateStatus("error")
      setUpdateMessage(`Erro ao baixar: ${err}`)
    }
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

          {/* Verificar atualização */}
          <div className="rounded-lg border p-4">
            <p className="text-base font-medium mb-1">Atualização do sistema</p>
            <p className="text-sm text-muted-foreground mb-3">
              Verifique se há uma nova versão disponível.
            </p>
            <div className="flex items-center gap-3">
              {updateStatus === "idle" && (
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-700 text-white hover:bg-cyan-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Verificar atualização
                </button>
              )}
              {updateStatus === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {updateMessage}
                </div>
              )}
              {updateStatus === "up-to-date" && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {updateMessage}
                </div>
              )}
              {updateStatus === "available" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-cyan-700">
                    <Download className="h-4 w-4" />
                    {updateMessage}
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadUpdate}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-cyan-700 text-white hover:bg-cyan-600 transition-colors w-fit"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Baixar e instalar
                  </button>
                </div>
              )}
              {updateStatus === "downloading" && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 text-sm text-cyan-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {updateMessage}
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2">
                    <div
                      className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {updateStatus === "ready" && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {updateMessage}
                </div>
              )}
              {updateStatus === "error" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {updateMessage}
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-colors w-fit"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
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
