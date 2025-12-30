"use client"

import { useState, useEffect, useCallback } from "react"
import { verificarAtivacao, verificarAtivacaoOffline } from "@/lib/ativacao"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

export interface AtivacaoStatus {
  ativada: boolean
  diasRestantes: number | null
  horasRestantes: number | null
  expirada: boolean
  modo: "online" | "offline" | "loading"
  chave?: string
}

export function useAtivacao() {
  const [status, setStatus] = useState<AtivacaoStatus>({
    ativada: false,
    diasRestantes: null,
    horasRestantes: null,
    expirada: false,
    modo: "loading",
  })

  const verificar = useCallback(async () => {
    try {
      // Garantir que o banco está inicializado
      await ensureLocalDbInitialized()
      
      const resultado = await verificarAtivacao()
      setStatus(resultado)
    } catch (error) {
      console.error("Erro ao verificar ativação:", error)
      // Em caso de erro, tenta verificar offline
      try {
        await ensureLocalDbInitialized()
        const offline = await verificarAtivacaoOffline()
        setStatus({
          ...offline,
          modo: "offline",
        })
      } catch (offlineError) {
        console.error("Erro ao verificar ativação offline:", offlineError)
        setStatus({
          ativada: false,
          diasRestantes: null,
          horasRestantes: null,
          expirada: false,
          modo: "offline",
        })
      }
    }
  }, [])

  useEffect(() => {
    verificar()
    
    // Verificar periodicamente (a cada 1 hora)
    const interval = setInterval(verificar, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [verificar])

  return {
    status,
    verificar,
  }
}

