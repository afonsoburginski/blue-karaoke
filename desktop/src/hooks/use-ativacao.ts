import { useState, useEffect, useCallback } from "react"
import { verificarAtivacao, type AtivacaoStatus } from "@/lib/tauri"

interface AtivacaoState extends AtivacaoStatus {
  modo: string | "loading"
}

export function useAtivacao() {
  const [status, setStatus] = useState<AtivacaoState>({
    ativada: false,
    expirada: false,
    modo: "loading",
    chave: null,
    diasRestantes: null,
    horasRestantes: null,
  })

  const verificar = useCallback(async () => {
    try {
      const result = await verificarAtivacao()
      setStatus(result)
    } catch (error) {
      console.error("Erro ao verificar ativacao:", error)
      setStatus(prev => ({ ...prev, modo: "offline" }))
    }
  }, [])

  useEffect(() => {
    verificar()
  }, [verificar])

  return { status, verificar }
}
