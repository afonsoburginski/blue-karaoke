import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2, Pause, RotateCcw, Keyboard, TriangleAlert } from "lucide-react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { useAtalhos } from "@/hooks/use-atalhos"
import { ATALHOS_CONFIGURÁVEIS, ATALHOS_FIXOS, TECLAS_RESERVADAS, formatarTecla, keyFromEvent } from "@/lib/atalhos"

// ---------------------------------------------------------------------------
// Editor de um único atalho
// ---------------------------------------------------------------------------

interface ShortcutRowProps {
  id: string
  acao: string
  descricao: string
  teclaAtual: string
  isCustom: boolean
  conflito: string | null
  capturando: boolean
  onStartCapture: () => void
  onReset: () => void
}

function ShortcutRow({
  acao,
  descricao,
  teclaAtual,
  isCustom,
  conflito,
  capturando,
  onStartCapture,
  onReset,
}: ShortcutRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b last:border-0">
      <div className="flex items-center gap-3 flex-wrap">
        {capturando ? (
          <span className="flex items-center gap-2 text-xs text-cyan-600 font-medium animate-pulse">
            <Keyboard className="h-3.5 w-3.5" />
            Pressione a nova tecla… (Esc para cancelar)
          </span>
        ) : (
          <>
            <Kbd
              className={`shrink-0 font-mono text-xs min-w-[2.5rem] text-center ${
                isCustom ? "border-cyan-500 text-cyan-700 bg-cyan-50" : ""
              }`}
            >
              {formatarTecla(teclaAtual)}
            </Kbd>
            <span className="flex-1 text-sm font-medium">{acao}</span>
            {conflito && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <TriangleAlert className="h-3 w-3" />
                Conflito com &ldquo;{conflito}&rdquo;
              </span>
            )}
            <button
              type="button"
              onClick={onStartCapture}
              className="text-xs px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 transition-colors font-medium"
            >
              Alterar
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={onReset}
                title="Restaurar padrão"
                className="text-xs px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-700 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground pl-1 leading-snug">{descricao}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props do dialog
// ---------------------------------------------------------------------------

interface OfflineInfo {
  musicasOffline: number
  totalMusicas: number
  musicasOnline?: number
}

interface ConfiguracoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offline?: OfflineInfo
  syncMessage?: string
  isDownloading?: boolean
  blockDownloads?: boolean
  onToggleBlockDownloads?: () => void
}

// ---------------------------------------------------------------------------
// Dialog principal
// ---------------------------------------------------------------------------

export function ConfiguracoesDialog({
  open,
  onOpenChange,
  offline,
  syncMessage,
  isDownloading,
  blockDownloads,
  onToggleBlockDownloads,
}: ConfiguracoesDialogProps) {
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "downloading" | "ready" | "up-to-date" | "error"
  >("idle")
  const [updateMessage, setUpdateMessage] = useState("")
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Atalhos
  const { getKey, setKey, resetKey, resetAll, isCustom, getConflito } = useAtalhos()
  const [capturandoId, setCapturandoId] = useState<string | null>(null)

  // Captura de tecla: listener global de alta prioridade
  useEffect(() => {
    if (!capturandoId) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()

      if (e.key === "Escape") {
        setCapturandoId(null)
        return
      }

      // Teclas reservadas pelo sistema (não configuráveis)
      if (TECLAS_RESERVADAS.has(e.key)) return

      // Teclas de modificador sozinhas
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock"].includes(e.key)) return

      // Usa código para teclas numpad (independente de locale do teclado)
      const tecla = keyFromEvent(e)
      setKey(capturandoId, tecla)
      setCapturandoId(null)
    }

    document.addEventListener("keydown", handler, { capture: true })
    return () => document.removeEventListener("keydown", handler, { capture: true })
  }, [capturandoId, setKey])

  // Fechar captura ao fechar o dialog
  useEffect(() => {
    if (!open) setCapturandoId(null)
  }, [open])

  const handleSincronizar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("checkNewMusic"))
  }, [])

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

      await relaunch()
    } catch (err) {
      console.error("[Updater] Download error:", err)
      setUpdateStatus("error")
      setUpdateMessage(`Erro ao baixar: ${err}`)
    }
  }

  const hasCustomKeys = ATALHOS_CONFIGURÁVEIS.some((a) => isCustom(a.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Configure o sistema, verifique atualizações e personalize os atalhos de teclado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ---------------------------------------------------------------- */}
          {/* Sincronizar músicas                                               */}
          {/* ---------------------------------------------------------------- */}
          <div className="rounded-lg border p-4">
            <p className="text-base font-medium mb-1">Sincronizar músicas</p>
            <p className="text-sm text-muted-foreground mb-2">
              Buscar novas músicas e atualizar o catálogo local. Na tela inicial, pressione{" "}
              <Kbd className="font-mono text-xs">{formatarTecla(getKey("sincronizar"))}</Kbd> para
              baixar ou sincronizar músicas.
            </p>
            {offline != null && (
              <div className="flex flex-wrap items-center gap-3 mb-3 py-2 px-3 rounded-md bg-muted/50">
                <span className="text-sm font-medium text-stone-700">
                  🎵 {offline.musicasOffline} de{" "}
                  {offline.totalMusicas ?? offline.musicasOffline + (offline.musicasOnline ?? 0)}{" "}
                  músicas
                </span>
                {(syncMessage || isDownloading) && onToggleBlockDownloads && (
                  <>
                    <span className="text-stone-400">|</span>
                    {blockDownloads ? (
                      <button
                        type="button"
                        onClick={onToggleBlockDownloads}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-sm"
                        title="Clique para retomar"
                      >
                        <Pause className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="text-amber-700 font-medium">Pausado</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onToggleBlockDownloads}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-sm"
                        title="Clique para pausar"
                      >
                        <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <span className="text-cyan-700 font-medium">
                          {isDownloading ? "Baixando…" : syncMessage || "Sincronizando…"}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleSincronizar}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Sincronizar agora
            </button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Verificar atualização                                             */}
          {/* ---------------------------------------------------------------- */}
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

          {/* ---------------------------------------------------------------- */}
          {/* Personalizar atalhos                                              */}
          {/* ---------------------------------------------------------------- */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-medium">Personalizar atalhos</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Clique em <strong>Alterar</strong> e pressione a tecla desejada. Teclas em{" "}
                  <span className="text-cyan-700 font-medium">azul</span> foram customizadas.
                </p>
              </div>
              {hasCustomKeys && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 text-sm text-stone-600 hover:text-stone-800 transition-colors font-medium whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar todos os padrões
                </button>
              )}
            </div>

            {/* Atalhos configuráveis */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Configuráveis
              </p>
              <div>
                {ATALHOS_CONFIGURÁVEIS.map((a) => (
                  <ShortcutRow
                    key={a.id}
                    id={a.id}
                    acao={a.acao}
                    descricao={a.descricao}
                    teclaAtual={getKey(a.id)}
                    isCustom={isCustom(a.id)}
                    conflito={getConflito(a.id)}
                    capturando={capturandoId === a.id}
                    onStartCapture={() => setCapturandoId(a.id)}
                    onReset={() => resetKey(a.id)}
                  />
                ))}
              </div>
            </div>

            {/* Atalhos fixos */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Fixos (não alteráveis)
              </p>
              <ul className="space-y-2">
                {ATALHOS_FIXOS.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <Kbd className="shrink-0 font-mono text-xs">{formatarTecla(a.teclaDefault)}</Kbd>
                    <div>
                      <span className="text-sm font-medium">{a.acao}</span>
                      <p className="text-xs text-muted-foreground leading-snug">{a.descricao}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Teclas reservadas</strong> (não podem ser usadas como atalho): F12, Enter,
              Backspace, Tab e dígitos 0–9.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
