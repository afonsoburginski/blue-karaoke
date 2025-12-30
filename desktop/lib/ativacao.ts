/**
 * Utilitários para gerenciar ativação do sistema desktop
 * - Validação online da chave
 * - Armazenamento local no SQLite
 * - Verificação offline
 */

import { localDb } from "./db/local-db"
import { ativacaoLocal } from "./db/local-schema"
import { eq } from "drizzle-orm"
import { ensureLocalDbInitialized } from "./db/auto-init"

// URL da API Web - usar variável de ambiente ou fallback para produção
const API_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  process.env.NEXT_PUBLIC_APP_URL || 
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.bluekaraokes.com.br")

export interface ValidacaoChaveResponse {
  valida: boolean
  chave?: {
    id: string
    chave: string
    tipo: "assinatura" | "maquina"
    diasRestantes: number | null
    horasRestantes: number | null
    dataExpiracao: string | null
  }
  user?: {
    id: string
    name: string
    email: string
  }
  error?: string
}

/**
 * Valida chave de ativação online e salva localmente
 */
export async function validarChaveOnline(chave: string): Promise<ValidacaoChaveResponse> {
  try {
    // Timeout de 10 segundos para a requisição
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${API_URL}/api/ativacao/validar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chave }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }))
      return {
        valida: false,
        error: errorData.error || "Erro ao validar chave",
      }
    }

    const data: ValidacaoChaveResponse = await response.json()

    if (data.valida && data.chave) {
      // Garantir que o banco está inicializado
      await ensureLocalDbInitialized()
      
      // Salvar no banco local
      const now = Date.now()
      const dataExpiracaoTimestamp = data.chave.dataExpiracao
        ? new Date(data.chave.dataExpiracao).getTime()
        : null

      // Verificar se já existe ativação
      const [existing] = await localDb
        .select()
        .from(ativacaoLocal)
        .where(eq(ativacaoLocal.id, "1"))
        .limit(1)

      if (existing) {
        // Atualizar
        await localDb
          .update(ativacaoLocal)
          .set({
            chave: data.chave.chave,
            tipo: data.chave.tipo,
            diasRestantes: data.chave.diasRestantes,
            horasRestantes: data.chave.horasRestantes,
            dataExpiracao: dataExpiracaoTimestamp,
            dataValidacao: now,
            updatedAt: now,
          })
          .where(eq(ativacaoLocal.id, "1"))
      } else {
        // Criar nova
        await localDb.insert(ativacaoLocal).values({
          id: "1",
          chave: data.chave.chave,
          tipo: data.chave.tipo,
          diasRestantes: data.chave.diasRestantes,
          horasRestantes: data.chave.horasRestantes,
          dataExpiracao: dataExpiracaoTimestamp,
          dataValidacao: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return data
  } catch (error: any) {
    console.error("Erro ao validar chave online:", error)
    
    // Tratar diferentes tipos de erro
    if (error.name === "AbortError") {
      return {
        valida: false,
        error: "Tempo de espera esgotado. Verifique sua conexão.",
      }
    }
    
    return {
      valida: false,
      error: error.message || "Erro de conexão",
    }
  }
}

/**
 * Verifica se há ativação válida no banco local (modo offline)
 */
export async function verificarAtivacaoOffline(): Promise<{
  ativada: boolean
  diasRestantes: number | null
  horasRestantes: number | null
  expirada: boolean
  chave?: string
}> {
  try {
    // Garantir que o banco está inicializado
    await ensureLocalDbInitialized()
    
    const [ativacao] = await localDb
      .select()
      .from(ativacaoLocal)
      .where(eq(ativacaoLocal.id, "1"))
      .limit(1)

    if (!ativacao) {
      return {
        ativada: false,
        diasRestantes: null,
        horasRestantes: null,
        expirada: false,
      }
    }

    const now = Date.now()

    // Verificar expiração
    let expirada = false
    if (ativacao.tipo === "assinatura" && ativacao.dataExpiracao) {
      expirada = ativacao.dataExpiracao < now
      
      // Recalcular dias restantes baseado na data de expiração
      if (!expirada) {
        const diffTime = ativacao.dataExpiracao - now
        const diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        return {
          ativada: true,
          diasRestantes,
          horasRestantes: null,
          expirada: false,
          chave: ativacao.chave,
        }
      }
    } else if (ativacao.tipo === "maquina" && ativacao.horasRestantes !== null && ativacao.dataValidacao) {
      // Para máquina, recalcular horas restantes baseado no tempo decorrido desde a última validação
      const tempoDecorrido = (now - ativacao.dataValidacao) / (1000 * 60 * 60) // em horas
      const horasRestantesAtualizadas = Math.max(0, ativacao.horasRestantes - tempoDecorrido)
      expirada = horasRestantesAtualizadas <= 0
      
      return {
        ativada: !expirada,
        diasRestantes: null,
        horasRestantes: horasRestantesAtualizadas,
        expirada,
        chave: ativacao.chave,
      }
    } else if (ativacao.tipo === "maquina" && ativacao.horasRestantes !== null) {
      // Fallback: usar horas restantes salvas sem recalcular
      expirada = ativacao.horasRestantes <= 0
      return {
        ativada: !expirada,
        diasRestantes: null,
        horasRestantes: ativacao.horasRestantes,
        expirada,
        chave: ativacao.chave,
      }
    }

    return {
      ativada: !expirada,
      diasRestantes: ativacao.diasRestantes,
      horasRestantes: ativacao.horasRestantes,
      expirada,
      chave: ativacao.chave,
    }
  } catch (error) {
    console.error("Erro ao verificar ativação offline:", error)
    return {
      ativada: false,
      diasRestantes: null,
      horasRestantes: null,
      expirada: false,
    }
  }
}

/**
 * Remove ativação local (logout/desativação)
 */
export async function removerAtivacaoLocal(): Promise<void> {
  try {
    await localDb.delete(ativacaoLocal).where(eq(ativacaoLocal.id, "1"))
  } catch (error) {
    console.error("Erro ao remover ativação local:", error)
  }
}

/**
 * Verifica se o sistema está ativado (tenta online primeiro, depois offline)
 */
export async function verificarAtivacao(): Promise<{
  ativada: boolean
  diasRestantes: number | null
  horasRestantes: number | null
  expirada: boolean
  modo: "online" | "offline"
  chave?: string
}> {
  // Primeiro verifica offline para ver se há chave salva
  const ativacaoOffline = await verificarAtivacaoOffline()
  
  // Se não houver chave offline ou estiver expirada, retornar imediatamente
  if (!ativacaoOffline.chave || ativacaoOffline.expirada) {
    return {
      ...ativacaoOffline,
      modo: "offline",
    }
  }
  
  // Se houver chave válida offline, tenta validar online para atualizar dados
  if (ativacaoOffline.ativada && !ativacaoOffline.expirada && ativacaoOffline.chave) {
    try {
      const validacaoOnline = await validarChaveOnline(ativacaoOffline.chave)
      if (validacaoOnline.valida && validacaoOnline.chave) {
        return {
          ativada: true,
          diasRestantes: validacaoOnline.chave.diasRestantes,
          horasRestantes: validacaoOnline.chave.horasRestantes,
          expirada: false,
          modo: "online",
          chave: ativacaoOffline.chave,
        }
      } else {
        // Se a validação online falhar (chave inválida/expirada), retornar erro
        return {
          ativada: false,
          diasRestantes: null,
          horasRestantes: null,
          expirada: true,
          modo: "offline",
          chave: ativacaoOffline.chave,
        }
      }
    } catch (error) {
      // Se falhar online (erro de conexão), usa dados offline
      console.warn("Não foi possível validar online, usando dados offline:", error)
    }
  }

  // Retorna dados offline (fallback)
  return {
    ...ativacaoOffline,
    modo: "offline",
  }
}

