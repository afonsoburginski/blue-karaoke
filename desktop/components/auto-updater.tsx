"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Download, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UpdateInfo {
  version: string
  isDownloading?: boolean
  isDownloaded?: boolean
  error?: string
}

declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<void>
      onUpdateAvailable: (cb: (data: { version: string }) => void) => void
      onUpdateNotAvailable: (cb: () => void) => void
      onUpdateDownloaded: (cb: (data: { version: string }) => void) => void
      onUpdateError: (cb: (message: string) => void) => void
      quitAndInstall: () => Promise<void>
      downloadAndInstallUpdate: (version: string) => Promise<{ ok: boolean; error?: string }>
    }
  }
}

export function AutoUpdater() {
  const [isElectron, setIsElectron] = useState(false)
  const [currentVersion, setCurrentVersion] = useState("")
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Verificar se está no Electron e obter versão
  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      setIsElectron(true)
      window.electron.getAppVersion().then((version) => {
        setCurrentVersion(version)
      })
    }
  }, [])

  // Registrar callbacks de atualização
  useEffect(() => {
    if (!isElectron || !window.electron) return

    window.electron.onUpdateAvailable((data) => {
      console.log("[AutoUpdater] Atualização disponível:", data.version)
      setUpdateInfo({ version: data.version, isDownloading: true })
      setDialogOpen(true)
      toast.info(`Nova versão ${data.version} disponível! Baixando...`, {
        duration: 5000,
        icon: <Download className="h-4 w-4" />,
      })
    })

    window.electron.onUpdateNotAvailable(() => {
      console.log("[AutoUpdater] Nenhuma atualização disponível")
      setIsChecking(false)
    })

    window.electron.onUpdateDownloaded((data) => {
      console.log("[AutoUpdater] Atualização baixada:", data.version)
      setUpdateInfo((prev) => prev ? { ...prev, isDownloading: false, isDownloaded: true } : { version: data.version, isDownloaded: true })
      setDialogOpen(true)
      toast.success(`Versão ${data.version} pronta para instalar!`, {
        duration: 10000,
        icon: <CheckCircle className="h-4 w-4" />,
        action: {
          label: "Instalar Agora",
          onClick: () => handleInstall(),
        },
      })
    })

    window.electron.onUpdateError((message) => {
      console.log("[AutoUpdater] Erro:", message)
      setUpdateInfo((prev) => prev ? { ...prev, error: message, isDownloading: false } : null)
      setIsChecking(false)
      // Não mostrar toast de erro para não assustar o usuário
    })
  }, [isElectron])

  // Verificar atualizações automaticamente ao iniciar (com delay)
  useEffect(() => {
    if (!isElectron || !window.electron) return

    const timer = setTimeout(() => {
      console.log("[AutoUpdater] Verificando atualizações automaticamente...")
      window.electron?.checkForUpdates()
    }, 5000) // 5 segundos após iniciar

    return () => clearTimeout(timer)
  }, [isElectron])

  // Verificar atualizações manualmente
  const checkForUpdates = useCallback(async () => {
    if (!window.electron) return
    setIsChecking(true)
    setUpdateInfo(null)
    toast.info("Verificando atualizações...", {
      duration: 2000,
      icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    })
    await window.electron.checkForUpdates()
    
    // Timeout para caso não receba resposta
    setTimeout(() => {
      setIsChecking(false)
    }, 30000)
  }, [])

  // Instalar atualização
  const handleInstall = useCallback(async () => {
    if (!window.electron || !updateInfo?.version) return
    
    setIsInstalling(true)
    
    if (updateInfo.isDownloaded) {
      // Atualização já baixada pelo electron-updater
      await window.electron.quitAndInstall()
    } else {
      // Baixar e instalar manualmente (fallback)
      toast.info("Baixando atualização...", {
        duration: 60000,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      })
      const result = await window.electron.downloadAndInstallUpdate(updateInfo.version)
      if (!result.ok) {
        toast.error(`Erro ao atualizar: ${result.error}`, {
          duration: 5000,
          icon: <XCircle className="h-4 w-4" />,
        })
        setIsInstalling(false)
      }
    }
  }, [updateInfo])

  // Não renderizar nada se não for Electron
  if (!isElectron) return null

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {updateInfo?.isDownloaded ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Atualização Pronta
              </>
            ) : updateInfo?.isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                Baixando Atualização
              </>
            ) : (
              <>
                <Download className="h-5 w-5 text-cyan-400" />
                Nova Versão Disponível
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {updateInfo?.isDownloaded ? (
              <>
                A versão <span className="text-cyan-400 font-semibold">{updateInfo.version}</span> foi baixada e está pronta para instalar.
                <br />
                <span className="text-zinc-500 text-sm">O app será reiniciado automaticamente.</span>
              </>
            ) : updateInfo?.isDownloading ? (
              <>
                Baixando versão <span className="text-cyan-400 font-semibold">{updateInfo.version}</span>...
                <br />
                <span className="text-zinc-500 text-sm">Aguarde o download completar.</span>
              </>
            ) : (
              <>
                Versão atual: <span className="text-zinc-300">{currentVersion}</span>
                <br />
                Nova versão: <span className="text-cyan-400 font-semibold">{updateInfo?.version}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          {updateInfo?.error ? (
            <div className="flex-1 text-red-400 text-sm">
              Erro: {updateInfo.error}
            </div>
          ) : null}
          
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={isInstalling}
          >
            Depois
          </Button>
          
          {updateInfo?.isDownloaded ? (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Instalar e Reiniciar
                </>
              )}
            </Button>
          ) : updateInfo?.isDownloading ? (
            <Button disabled className="bg-zinc-700 text-zinc-400">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Baixando...
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar e Instalar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
