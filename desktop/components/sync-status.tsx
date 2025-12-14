"use client"

import { useAutoSync } from "@/hooks/useAutoSync"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { SyncPermissionDialog } from "@/components/sync-permission-dialog"

export function SyncStatus() {
  // Verificar novas músicas quando online, mas só sincronizar com permissão do usuário
  const sync = useAutoSync(30)
  const [showMessage, setShowMessage] = useState(false)

  // Listener para verificação manual (tecla *)
  useEffect(() => {
    const handleCheckNewMusic = () => {
      if (sync.checkManually) {
        sync.checkManually()
      }
    }

    window.addEventListener("checkNewMusic" as any, handleCheckNewMusic)
    return () => {
      window.removeEventListener("checkNewMusic" as any, handleCheckNewMusic)
    }
  }, [sync.checkManually])

  // Mostrar mensagem quando houver download ou quando não há novas músicas
  useEffect(() => {
    if (sync.downloaded > 0 && sync.message) {
      setShowMessage(true)
      // Esconder após 5 segundos
      const timer = setTimeout(() => {
        setShowMessage(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else if (sync.message && sync.message.includes("Todas as músicas")) {
      setShowMessage(true)
      // Esconder após 3 segundos
      const timer = setTimeout(() => {
        setShowMessage(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [sync.downloaded, sync.message])

  // Mostrar diálogo de permissão se necessário
  if (sync.showPermissionDialog && sync.availableCount > 0) {
    return (
      <SyncPermissionDialog
        availableCount={sync.availableCount}
        onAllow={sync.allowSync}
        onDeny={sync.denySync}
      />
    )
  }

  // Não mostrar nada se não estiver sincronizando, não houver mensagem e não houver erro
  if (!sync.isSyncing && !showMessage && !sync.error && !sync.showPermissionDialog) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-black/90 backdrop-blur-sm border border-cyan-400/30 rounded-lg shadow-2xl p-4 min-w-[280px]">
        {sync.isSyncing ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Baixando músicas novas
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Servidor Blue Karaoke
              </p>
            </div>
          </div>
        ) : sync.error ? (
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Erro na sincronização</p>
              <p className="text-xs text-red-400 mt-0.5 truncate">
                {sync.error}
              </p>
            </div>
          </div>
        ) : showMessage && sync.downloaded > 0 ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {sync.downloaded} {sync.downloaded === 1 ? "música baixada" : "músicas baixadas"}w
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {sync.message || "Sincronização concluída"}
              </p>
            </div>
          </div>
        ) : showMessage && sync.message && sync.message.includes("Todas as músicas") ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Todas as músicas já foram baixadas!
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Não há novas músicas disponíveis
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

