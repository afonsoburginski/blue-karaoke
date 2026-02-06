import { useEffect, useRef, useState, useCallback } from "react"
import { getOfflineStatus, downloadBatch, reindexMusicas, type OfflineStatus } from "@/lib/tauri"

interface SyncState {
  isDownloading: boolean
  message: string | null
  offline: OfflineStatus
}

interface UseAutoSyncOptions {
  intervalMinutes?: number
  isActivated?: boolean
  blockDownloads?: boolean
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const { intervalMinutes = 30, isActivated = false, blockDownloads = false } = options
  const blockRef = useRef(blockDownloads)
  blockRef.current = blockDownloads
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [state, setState] = useState<SyncState>({
    isDownloading: false,
    message: null,
    offline: { totalMusicas: 0, musicasOffline: 0, musicasOnline: 0, storageUsed: 0, storageUsedMB: 0 },
  })

  const checkOfflineStatus = useCallback(async () => {
    try {
      const status = await getOfflineStatus()
      setState(prev => ({ ...prev, offline: status }))
    } catch (e) {
      console.error("[AutoSync] Erro status:", e)
    }
  }, [])

  const downloadMetadata = useCallback(async () => {
    if (!isActivated || blockRef.current) return
    // Reindex first
    try {
      await reindexMusicas()
    } catch {}
    await checkOfflineStatus()
  }, [isActivated, checkOfflineStatus])

  const startBackgroundDownload = useCallback(async () => {
    if (!isActivated || blockRef.current) return
    if (state.isDownloading) return

    setState(prev => ({ ...prev, isDownloading: true }))

    try {
      const result = await downloadBatch(3)
      console.log(`[AutoSync] Batch: ${result.downloaded} baixados, ${result.remaining} restantes`)
      await checkOfflineStatus()

      if (result.remaining > 0 && !blockRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          batchTimeoutRef.current = null
          startBackgroundDownload()
        }, 5000)
      } else {
        setState(prev => ({ ...prev, isDownloading: false }))
      }
    } catch (e) {
      console.error("[AutoSync] Erro batch:", e)
      setState(prev => ({ ...prev, isDownloading: false }))
    }
  }, [isActivated, state.isDownloading, checkOfflineStatus])

  // Block downloads: cancel pending batch
  useEffect(() => {
    if (!blockDownloads) return
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
      batchTimeoutRef.current = null
    }
    setState(prev => ({ ...prev, isDownloading: false }))
  }, [blockDownloads])

  // Initial: reindex + check status
  useEffect(() => {
    reindexMusicas().then(() => checkOfflineStatus()).catch(() => checkOfflineStatus())
  }, [checkOfflineStatus])

  // Auto-start background download when there are pending musicas
  useEffect(() => {
    if (!isActivated || blockDownloads || state.isDownloading) return
    if (state.offline.musicasOnline > 0) {
      const timer = setTimeout(() => startBackgroundDownload(), 10000)
      return () => clearTimeout(timer)
    }
  }, [isActivated, blockDownloads, state.offline.musicasOnline, state.isDownloading, startBackgroundDownload])

  // Periodic check
  useEffect(() => {
    const interval = setInterval(checkOfflineStatus, intervalMinutes * 60 * 1000)
    return () => clearInterval(interval)
  }, [intervalMinutes, checkOfflineStatus])

  return {
    ...state,
    downloadMetadata,
    downloadAllForOffline: startBackgroundDownload,
    startBackgroundDownload,
    checkOfflineStatus,
  }
}
