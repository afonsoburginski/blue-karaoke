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

const comandosTelaInicial = [
  { tecla: "F12", acao: "Abrir configurações" },
  { tecla: "Esc", acao: "Fechar programa (Electron)" },
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
  { tecla: "Esc", acao: "Fechar programa (Electron)" },
  { tecla: "Delete", acao: "Sair da música e voltar à tela inicial" },
  { tecla: "+", acao: "Reiniciar música atual (voltar ao início)" },
  { tecla: "P", acao: "Pausar / retomar reprodução" },
  { tecla: "C", acao: "Tocar música aleatória" },
  { tecla: "Enter", acao: "Segurar para finalizar e voltar (ou confirmar busca)" },
  { tecla: "Backspace", acao: "Apagar caractere na busca" },
  { tecla: "0–9 e letras", acao: "Digitar na busca ou código para adicionar à fila “próxima”" },
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
              Durante a música: digite 5 dígitos para adicionar à fila “próxima”; ao terminar a atual, a próxima toca automaticamente.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
