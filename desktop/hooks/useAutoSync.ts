"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface OfflineStatus {
  totalMusicas: number
  musicasOffline: number
  musicasOnline: number
  storageUsed: number
  storageUsedMB: number
}

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  isDownloading: boolean
  lastSync: Date | null
  error: string | null
  message: string | null
  offline: OfflineStatus
  downloadProgress: {
    current: number
    total: number
    currentMusica: string
  } | null
}

interface UseAutoSyncOptions {
  intervalMinutes?: number
  isActivated?: boolean  // Se o usuário tem chave válida
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const { intervalMinutes = 30, isActivated = false } = options
  
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    isSyncing: false,
    isDownloading: false,
    lastSync: null,
    error: null,
    message: null,
    offline: {
      totalMusicas: 0,
      musicasOffline: 0,
      musicasOnline: 0,
      storageUsed: 0,
      storageUsedMB: 0,
    },
    downloadProgress: null,
  })
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar status offline
  const checkOfflineStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/sync", { method: "GET" })
      if (!response.ok) return

      const data = await response.json()
      
      setStatus((prev) => ({
        ...prev,
        offline: data.offline || prev.offline,
        error: null,
      }))
    } catch (error) {
      console.error("[AutoSync] Erro ao verificar status offline:", error)
    }
  }, [])

  // Baixar metadados das músicas
  const downloadMetadata = useCallback(async () => {
    if (!isActivated) return // Silenciosamente ignora se não ativado
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }))

    try {
      const response = await fetch("/api/sync?action=download-metadata", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[AutoSync] Metadados baixados:", data)

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null,
        message: null,
      }))

      // Atualizar status offline
      await checkOfflineStatus()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[AutoSync] Erro ao baixar metadados:", errorMessage)
      
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }))
    }
  }, [isActivated, checkOfflineStatus])

  // Baixar todas as músicas para offline
  const downloadAllForOffline = useCallback(async () => {
    if (!isActivated) return
    setStatus((prev) => ({ 
      ...prev, 
      isDownloading: true, 
      error: null,
      message: null
    }))

    try {
      const response = await fetch("/api/sync?action=download", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[AutoSync] Download completo:", data)

      setStatus((prev) => ({
        ...prev,
        isDownloading: false,
        lastSync: new Date(),
        error: null,
        message: null,
        downloadProgress: null,
      }))

      // Atualizar status offline
      await checkOfflineStatus()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[AutoSync] Erro ao baixar músicas:", errorMessage)
      
      setStatus((prev) => ({
        ...prev,
        isDownloading: false,
        error: errorMessage,
        downloadProgress: null,
      }))
    }
  }, [isActivated, checkOfflineStatus])

  // Baixar músicas em lote (background)
  const downloadBatch = useCallback(async () => {
    if (!isActivated) return // Silenciosamente ignora se não ativado
    if (status.isDownloading || status.isSyncing) return

    try {
      const response = await fetch("/api/sync?action=download-batch&size=3", {
        method: "POST",
      })

      if (!response.ok) return

      const data = await response.json()
      console.log(`[AutoSync] Lote: ${data.downloaded} baixados, ${data.remaining} restantes`)

      // Atualizar status
      await checkOfflineStatus()

      // Se ainda há músicas para baixar, agendar próximo lote
      if (data.remaining > 0) {
        setTimeout(() => downloadBatch(), 5000) // 5 segundos entre lotes
      }
    } catch (error) {
      console.error("[AutoSync] Erro no download em lote:", error)
    }
  }, [isActivated, status.isDownloading, status.isSyncing, checkOfflineStatus])

  // Iniciar download em background automaticamente
  const startBackgroundDownload = useCallback(() => {
    downloadBatch()
  }, [downloadBatch])

  // Verificar conexão
  useEffect(() => {
    const handleOnline = () => {
      console.log("[AutoSync] Conexão detectada")
      setStatus((prev) => ({ ...prev, isOnline: true }))
      // Verificar status quando voltar online
      checkOfflineStatus()
    }

    const handleOffline = () => {
      console.log("[AutoSync] Conexão perdida")
      setStatus((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Verificar status inicial
    if (typeof navigator !== "undefined" && navigator.onLine) {
      checkOfflineStatus()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [checkOfflineStatus])

  // Verificar periodicamente o status offline
  useEffect(() => {
    if (!status.isOnline) return

    const checkInterval = intervalMinutes * 60 * 1000

    checkTimeoutRef.current = setTimeout(() => {
      checkOfflineStatus()
    }, checkInterval)

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [status.isOnline, intervalMinutes, checkOfflineStatus])

  // Iniciar download em background quando há músicas pendentes E usuário está ativado
  useEffect(() => {
    if (!isActivated) return
    if (!status.isOnline) return
    if (status.isDownloading || status.isSyncing) return
    
    // Se há músicas para baixar, iniciar em background após 10 segundos
    if (status.offline.musicasOnline > 0) {
      const timer = setTimeout(() => {
        downloadBatch()
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [isActivated, status.isOnline, status.offline.musicasOnline, status.isDownloading, status.isSyncing, downloadBatch])

  return {
    ...status,
    checkOfflineStatus,
    downloadMetadata,
    downloadAllForOffline,
    startBackgroundDownload,
  }
}
