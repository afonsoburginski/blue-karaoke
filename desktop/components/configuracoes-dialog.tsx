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
import { RefreshCw, Download, Loader2, FileText, FolderOpen } from "lucide-react"

// Atualizações via electron-updater (GitHub Releases).

interface ConfiguracoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Só no Electron */
  openAtLogin?: boolean
  setOpenAtLogin?: (value: boolean) => void
}

const GITHUB_RELEASES_API = "https://api.github.com/repos/afonsoburginski/blue-karaoke/releases/latest"
const GITHUB_RELEASES_PAGE = "https://github.com/afonsoburginski/blue-karaoke/releases"

/** Compara versões "1.0.34" e "1.0.35"; retorna true se latest > current */
function isNewerVersion(latest: string, current: string): boolean {
  const toParts = (v: string) => v.replace(/^v/, "").split(".").map(Number)
  const a = toParts(latest)
  const b = toParts(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
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
  const temLogPath = typeof window !== "undefined" && typeof window.electron?.getLogPath === "function"
  const temUpdater = typeof window !== "undefined" && typeof window.electron?.getAppVersion === "function"

  const [appVersion, setAppVersion] = useState<string>("")
  const [logPath, setLogPath] = useState<string>("")
  const [checking, setChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateNotAvailable, setUpdateNotAvailable] = useState(false)
  /** Fallback: versão mais nova encontrada pela API do GitHub (quando electron-updater não acha) */
  const [updateFromApi, setUpdateFromApi] = useState<{ version: string; url: string } | null>(null)

  useEffect(() => {
    if (temLogPath && window.electron?.getLogPath) {
      window.electron.getLogPath().then((p: string) => setLogPath(p || ""))
    }
  }, [temLogPath])

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
    if (!temUpdater) return
    setChecking(true)
    setUpdateError(null)
    setUpdateNotAvailable(false)
    setUpdateAvailable(null)
    setUpdateDownloaded(null)
    setUpdateFromApi(null)

    if (window.electron?.checkForUpdates) {
      window.electron.checkForUpdates()
    }

    // Fallback: consultar API do GitHub; se houver versão mais nova, mostrar link para baixar
    const currentVer = appVersion
    if (!currentVer) return setChecking(false)
    fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { tag_name?: string; html_url?: string } | null) => {
        if (!data?.tag_name || !currentVer) return
        const latestVer = data.tag_name.replace(/^v/, "")
        if (isNewerVersion(latestVer, currentVer)) {
          setUpdateFromApi({
            version: latestVer,
            url: data.html_url || GITHUB_RELEASES_PAGE,
          })
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }

  const handleReiniciarEInstalar = () => {
    window.electron?.quitAndInstall?.()
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
              {updateFromApi && (
                <div className="space-y-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-3">
                  <p className="text-sm font-medium text-emerald-200">
                    Nova versão {updateFromApi.version} disponível
                  </p>
                  <a
                    href={updateFromApi.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Baixar no GitHub
                  </a>
                </div>
              )}
              {updateNotAvailable && !updateFromApi && (
                <p className="text-sm text-muted-foreground">Você está na versão mais recente.</p>
              )}
              {updateError && (
                <p className="text-sm text-destructive">{updateError}</p>
              )}
            </div>
          )}

          {/* Arquivo de log (Electron) */}
          {temLogPath && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden />
                Logs e erros
              </p>
              <p className="text-sm text-muted-foreground">
                O app grava todos os logs e erros em um arquivo na pasta do aplicativo. Você pode abrir a pasta para
                ver o arquivo <code className="text-xs bg-muted px-1 rounded">blue-karaoke.log</code>.
              </p>
              {logPath && (
                <p className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded p-2">
                  {logPath}
                </p>
              )}
              <button
                type="button"
                onClick={() => window.electron?.openLogFolder?.()}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-colors"
              >
                <FolderOpen className="h-4 w-4" aria-hidden />
                Abrir pasta de logs
              </button>
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
