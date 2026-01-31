"use client"

import { useEffect, useState } from "react"
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
import { RefreshCw, Download, Loader2 } from "lucide-react"

// Atualizações via electron-updater (GitHub Releases).

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
  const temUpdater = typeof window !== "undefined" && typeof window.electron?.getAppVersion === "function"

  const [appVersion, setAppVersion] = useState<string>("")
  const [checking, setChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateNotAvailable, setUpdateNotAvailable] = useState(false)

  useEffect(() => {
    if (!temUpdater || !window.electron?.getAppVersion) return
    window.electron?.getAppVersion?.().then((v: string) => setAppVersion(v))
    window.electron.onUpdateAvailable?.((data: { version?: string }) => {
      setUpdateAvailable(data?.version ?? null)
      setUpdateError(null)
      setUpdateNotAvailable(false)
    })
    window.electron.onUpdateNotAvailable?.(() => {
      setChecking(false)
      setUpdateNotAvailable(true)
      setUpdateError(null)
    })
    window.electron.onUpdateDownloaded?.((data: { version?: string }) => {
      setUpdateDownloaded(data?.version ?? null)
      setChecking(false)
    })
    window.electron.onUpdateError?.((message: string) => {
      setChecking(false)
      setUpdateError(message ?? "Erro ao verificar atualização.")
    })
  }, [temUpdater])

  const handleSincronizar = () => {
    window.dispatchEvent(new CustomEvent("checkNewMusic"))
    onOpenChange(false)
  }

  const handleVerificarAtualizacao = () => {
    if (!window.electron?.checkForUpdates) return
    setChecking(true)
    setUpdateError(null)
    setUpdateNotAvailable(false)
    setUpdateAvailable(null)
    setUpdateDownloaded(null)
    window.electron.checkForUpdates()
  }

  const handleReiniciarEInstalar = () => {
    window.electron?.quitAndInstall?.()
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

          {/* Atualizações (app empacotado com electron-updater) */}
          {temUpdater && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-base font-medium">Atualizações</p>
              <p className="text-sm text-muted-foreground">
                {appVersion ? `Versão atual: ${appVersion}` : "Versão do app (Electron)."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerificarAtualizacao}
                  disabled={checking}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-60 transition-colors"
                >
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  )}
                  {checking ? "Verificando…" : "Verificar atualizações"}
                </button>
                {updateDownloaded && (
                  <button
                    type="button"
                    onClick={handleReiniciarEInstalar}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-600 transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Reiniciar e instalar
                  </button>
                )}
              </div>
              {updateAvailable && !updateDownloaded && (
                <p className="text-sm text-muted-foreground">
                  Nova versão {updateAvailable} disponível. Baixando…
                </p>
              )}
              {updateNotAvailable && (
                <p className="text-sm text-muted-foreground">Você está na versão mais recente.</p>
              )}
              {updateError && (
                <p className="text-sm text-destructive">{updateError}</p>
              )}
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
