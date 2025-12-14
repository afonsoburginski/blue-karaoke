"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSync: Date | null
  error: string | null
  downloaded: number
  message: string | null
  availableCount: number
  showPermissionDialog: boolean
}

export function useAutoSync(intervalMinutes: number = 30) {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    isSyncing: false,
    lastSync: null,
    error: null,
    downloaded: 0,
    message: null,
    availableCount: 0,
    showPermissionDialog: false,
  })
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialSyncRef = useRef(false)
  const lastDeniedRef = useRef<Date | null>(null)

  // Verificar se há novas músicas disponíveis
  const checkForNewMusic = useCallback(async () => {
    // Não verificar se o usuário negou recentemente (aguardar 1 hora)
    if (lastDeniedRef.current) {
      const timeSinceDenied = Date.now() - lastDeniedRef.current.getTime()
      const oneHour = 60 * 60 * 1000
      if (timeSinceDenied < oneHour) {
        return // Ainda está no período de cooldown
      }
    }

    try {
      const response = await fetch("/api/sync", { method: "GET" })
      if (!response.ok) return

      const data = await response.json()
      const available = data.available || 0

      if (available > 0) {
        setStatus((prev) => {
          // Só mostrar se não estiver sincronizando e o diálogo não estiver aberto
          if (prev.isSyncing || prev.showPermissionDialog) return prev
          return {
            ...prev,
            availableCount: available,
            showPermissionDialog: true,
          }
        })
      }
    } catch (error) {
      console.error("[AutoSync] Erro ao verificar novas músicas:", error)
    }
  }, [])

  const performSync = useCallback(async () => {
    setStatus((prev) => {
      if (prev.isSyncing) return prev
      return { ...prev, isSyncing: true, error: null }
    })

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[AutoSync] Sync concluído:", data.message)

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null,
        downloaded: data.results?.downloaded || 0,
        message: data.message || null,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[AutoSync] Erro ao sincronizar:", errorMessage)
      
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }))
    }
  }, [])

  // Verificar conexão (sem sincronizar automaticamente)
  useEffect(() => {
    const handleOnline = () => {
      console.log("[AutoSync] Conexão detectada")
      setStatus((prev) => ({ ...prev, isOnline: true }))
      // Não sincronizar automaticamente - só verificar novas músicas
    }

    const handleOffline = () => {
      console.log("[AutoSync] Conexão perdida")
      setStatus((prev) => ({ ...prev, isOnline: false }))
    }

    // Marcar como inicializado, mas não sincronizar automaticamente
    if (typeof navigator !== "undefined" && navigator.onLine && !isInitialSyncRef.current) {
      isInitialSyncRef.current = true
      // Não executar sync automático - só verificar novas músicas depois
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const allowSync = useCallback(() => {
    setStatus((prev) => ({ ...prev, showPermissionDialog: false }))
    performSync()
  }, [performSync])

  const denySync = useCallback(() => {
    lastDeniedRef.current = new Date() // Registrar quando negou
    setStatus((prev) => ({ ...prev, showPermissionDialog: false, availableCount: 0 }))
  }, [])

  // Verificar periodicamente por novas músicas quando online (menos frequente)
  useEffect(() => {
    if (!status.isOnline || status.showPermissionDialog) return

    const checkInterval = 30 * 60 * 1000 // Verificar a cada 30 minutos (menos impertinente)

    const scheduleCheck = () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }

      checkTimeoutRef.current = setTimeout(() => {
        checkForNewMusic()
        scheduleCheck()
      }, checkInterval)
    }

    // Primeira verificação após 2 minutos (dar tempo para o app carregar)
    checkTimeoutRef.current = setTimeout(() => {
      checkForNewMusic()
      scheduleCheck()
    }, 2 * 60 * 1000)

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [status.isOnline, status.showPermissionDialog, checkForNewMusic])

  // Função para verificar manualmente novas músicas
  const checkManually = useCallback(async () => {
    // Resetar o cooldown de negação para permitir verificação manual
    lastDeniedRef.current = null
    
    try {
      const response = await fetch("/api/sync", { method: "GET" })
      if (!response.ok) {
        setStatus((prev) => ({
          ...prev,
          error: "Erro ao verificar novas músicas",
        }))
        return
      }

      const data = await response.json()
      const available = data.available || 0

      if (available > 0) {
        setStatus((prev) => ({
          ...prev,
          availableCount: available,
          showPermissionDialog: true,
          error: null,
        }))
      } else {
        // Não há novas músicas - mostrar mensagem temporária
        setStatus((prev) => ({
          ...prev,
          availableCount: 0,
          showPermissionDialog: false,
          error: null,
          message: "Todas as músicas já foram baixadas!",
        }))
        
        // Limpar mensagem após 3 segundos
        setTimeout(() => {
          setStatus((prev) => ({
            ...prev,
            message: null,
          }))
        }, 3000)
      }
    } catch (error) {
      console.error("[AutoSync] Erro ao verificar novas músicas:", error)
      setStatus((prev) => ({
        ...prev,
        error: "Erro ao verificar novas músicas",
      }))
    }
  }, [])

  return {
    ...status,
    performSync,
    allowSync,
    denySync,
    checkManually,
  }
}

