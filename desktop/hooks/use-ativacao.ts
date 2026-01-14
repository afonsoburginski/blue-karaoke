"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface AtivacaoStatus {
  ativada: boolean
  diasRestantes: number | null
  horasRestantes: number | null
  expirada: boolean
  modo: "online" | "offline" | "loading"
  chave?: string
  tipo?: "assinatura" | "maquina" | null
}

export function useAtivacao() {
  const [status, setStatus] = useState<AtivacaoStatus>({
    ativada: false,
    diasRestantes: null,
    horasRestantes: null,
    expirada: false,
    modo: "loading",
  })
  const initialLoadDone = useRef(false)

  // Verificação rápida offline (instantânea)
  const verificarOfflineRapido = useCallback(async () => {
    try {
      const response = await fetch("/api/ativacao/offline")
      if (response.ok) {
        const offline = await response.json()
        return { ...offline, modo: "offline" as const }
      }
    } catch {
      // Silently fail
    }
    return null
  }, [])

  // Verificação completa online (background)
  const verificarOnline = useCallback(async () => {
    try {
      const response = await fetch("/api/ativacao/verificar")
      if (response.ok) {
        const resultado = await response.json()
        setStatus(resultado)
      }
    } catch {
      // Silently fail - keep offline data
    }
  }, [])

  // Verificação pública (para revalidar após ativação)
  const verificar = useCallback(async () => {
    // Primeiro carrega offline (rápido)
    const offlineStatus = await verificarOfflineRapido()
    if (offlineStatus) {
      setStatus(offlineStatus)
    }
    // Depois valida online em background
    await verificarOnline()
  }, [verificarOfflineRapido, verificarOnline])

  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    // Carregamento inicial: offline primeiro, depois online em background
    const load = async () => {
      // 1. Carrega dados offline imediatamente (< 50ms)
      const offlineStatus = await verificarOfflineRapido()
      if (offlineStatus) {
        setStatus(offlineStatus)
      } else {
        // Se não há dados offline, marca como não ativado
        setStatus({
          ativada: false,
          diasRestantes: null,
          horasRestantes: null,
          expirada: false,
          modo: "offline",
        })
      }

      // 2. Valida online em background (não bloqueia UI)
      verificarOnline()
    }

    load()
    
    // Verificar periodicamente (a cada 1 hora)
    const interval = setInterval(verificarOnline, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [verificarOfflineRapido, verificarOnline])

  return {
    status,
    verificar,
  }
}

