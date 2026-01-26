/**
 * Utilitários para gerenciar ativação do sistema desktop
 * - Validação online da chave via Supabase
 * - Armazenamento local no SQLite
 * - Verificação offline
 */

import { localDb } from "./db/local-db"
import { ativacaoLocal } from "./db/local-schema"
import { eq } from "drizzle-orm"
import { ensureLocalDbInitialized } from "./db/auto-init"
import { supabase } from "./supabase-client"
import { normalizarChave, validarFormatoChave } from "./utils/chave-ativacao"

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
 * Valida chave de ativação online via Supabase e salva localmente
 */
export async function validarChaveOnline(chave: string): Promise<ValidacaoChaveResponse> {
  try {
    // Normalizar chave
    const chaveNormalizada = normalizarChave(chave)

    if (!validarFormatoChave(chaveNormalizada)) {
      return {
        valida: false,
        error: "O formato da chave está incorreto. Por favor, use o formato: XXXX-XXXX-XXXX-XXXX",
      }
    }

    // Buscar chave no Supabase
    const { data: chaveData, error: chaveError } = await supabase
      .from("chaves_ativacao")
      .select("*")
      .eq("chave", chaveNormalizada)
      .single()

    if (chaveError || !chaveData) {
      return {
        valida: false,
        error: "Chave de ativação não encontrada. Verifique se digitou corretamente ou entre em contato com o suporte.",
      }
    }

    // Verificar status
    if (chaveData.status !== "ativa") {
      if (chaveData.status === "expirada") {
        return {
          valida: false,
          error: "Esta chave de ativação expirou. Entre em contato com o suporte para renovar sua assinatura.",
        }
      }
      return {
        valida: false,
        error: "Esta chave de ativação não está disponível. Entre em contato com o suporte para mais informações.",
      }
    }

    const now = new Date()

    // Validações por tipo
    if (chaveData.tipo === "assinatura") {
      // Verificar expiração
      if (chaveData.data_expiracao && new Date(chaveData.data_expiracao) < now) {
        // Atualizar status no Supabase
        await supabase
          .from("chaves_ativacao")
          .update({ status: "expirada" })
          .eq("id", chaveData.id)

        return {
          valida: false,
          error: "Esta chave de ativação expirou. Entre em contato com o suporte para renovar sua assinatura.",
        }
      }

      // Verificar assinatura do usuário se existir
      if (chaveData.user_id) {
        const { data: assinatura, error: assinaturaError } = await supabase
          .from("assinaturas")
          .select("*")
          .eq("user_id", chaveData.user_id)
          .single()

        if (assinaturaError || !assinatura || assinatura.status !== "ativa") {
          return {
            valida: false,
            error: "Sua assinatura não está ativa. Entre em contato com o suporte para reativar sua conta.",
          }
        }
      }
    } else if (chaveData.tipo === "maquina") {
      // Verificar limite de tempo
      if (chaveData.limite_tempo && chaveData.data_inicio) {
        const horasUsadas =
          (now.getTime() - new Date(chaveData.data_inicio).getTime()) /
          (1000 * 60 * 60)

        if (horasUsadas >= chaveData.limite_tempo) {
          // Atualizar status no Supabase
          await supabase
            .from("chaves_ativacao")
            .update({ status: "expirada" })
            .eq("id", chaveData.id)

          return {
            valida: false,
            error: "O tempo de uso desta chave foi esgotado. Entre em contato com o suporte para adquirir uma nova chave.",
          }
        }
      } else if (chaveData.limite_tempo && !chaveData.data_inicio) {
        // Primeira vez usando - iniciar contagem
        await supabase
          .from("chaves_ativacao")
          .update({
            data_inicio: now.toISOString(),
            usado_em: now.toISOString(),
            ultimo_uso: now.toISOString(),
          })
          .eq("id", chaveData.id)
      } else {
        // Atualizar último uso
        await supabase
          .from("chaves_ativacao")
          .update({ ultimo_uso: now.toISOString() })
          .eq("id", chaveData.id)
      }
    }

    // Buscar dados do usuário se existir
    let userData = null
    if (chaveData.user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("id, name, email, user_type")
        .eq("id", chaveData.user_id)
        .single()

      if (user) {
        userData = {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      }
    }

    // Calcular dias restantes para chaves de assinatura
    let diasRestantes: number | null = null
    if (chaveData.tipo === "assinatura") {
      // Se tiver userId, verificar assinatura primeiro
      if (chaveData.user_id) {
        const { data: assinatura } = await supabase
          .from("assinaturas")
          .select("data_fim")
          .eq("user_id", chaveData.user_id)
          .eq("status", "ativa")
          .single()

        if (assinatura && assinatura.data_fim) {
          // Usar data_fim da assinatura
          const dataExpiracao = new Date(assinatura.data_fim)
          const diffTime = dataExpiracao.getTime() - now.getTime()
          diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        } else if (chaveData.data_expiracao) {
          // Fallback para data_expiracao da chave
          const dataExpiracao = new Date(chaveData.data_expiracao)
          const diffTime = dataExpiracao.getTime() - now.getTime()
          diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        }
      } else if (chaveData.data_expiracao) {
        // Chave sem userId, usar data_expiracao da chave
        const dataExpiracao = new Date(chaveData.data_expiracao)
        const diffTime = dataExpiracao.getTime() - now.getTime()
        diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }
    }

    // Calcular horas restantes para chaves de máquina
    let horasRestantes: number | null = null
    if (chaveData.tipo === "maquina" && chaveData.limite_tempo && chaveData.data_inicio) {
      horasRestantes = Math.max(
        0,
        chaveData.limite_tempo -
          (now.getTime() - new Date(chaveData.data_inicio).getTime()) /
            (1000 * 60 * 60)
      )
    }

    // Atualizar último uso para chaves de assinatura
    if (chaveData.tipo === "assinatura") {
      await supabase
        .from("chaves_ativacao")
        .update({ ultimo_uso: now.toISOString() })
        .eq("id", chaveData.id)
    }

    // Preparar resposta
    const response: ValidacaoChaveResponse = {
      valida: true,
      chave: {
        id: chaveData.id,
        chave: chaveData.chave,
        tipo: chaveData.tipo as "assinatura" | "maquina",
        diasRestantes,
        horasRestantes,
        dataExpiracao: chaveData.data_expiracao,
      },
      user: userData || undefined,
    }

    // Tentar salvar no banco local (cache para funcionar offline)
    // Se falhar, não impede a validação - o importante é o Supabase
    if (response.valida && response.chave) {
      // Executar de forma assíncrona e não bloquear
      ;(async () => {
        try {
          await ensureLocalDbInitialized()
          
          const nowTimestamp = Date.now()
          const dataExpiracaoTimestamp = response.chave!.dataExpiracao
            ? new Date(response.chave.dataExpiracao).getTime()
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
                chave: response.chave!.chave,
                tipo: response.chave!.tipo,
                diasRestantes: response.chave!.diasRestantes,
                horasRestantes: response.chave!.horasRestantes,
                dataExpiracao: dataExpiracaoTimestamp,
                dataValidacao: nowTimestamp,
                updatedAt: nowTimestamp,
              })
              .where(eq(ativacaoLocal.id, "1"))
          } else {
            // Criar nova
            await localDb.insert(ativacaoLocal).values({
              id: "1",
              chave: response.chave!.chave,
              tipo: response.chave!.tipo,
              diasRestantes: response.chave!.diasRestantes,
              horasRestantes: response.chave!.horasRestantes,
              dataExpiracao: dataExpiracaoTimestamp,
              dataValidacao: nowTimestamp,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            })
          }
        } catch (dbError: any) {
          // Log do erro mas não falha a validação
          console.warn("⚠️ Não foi possível salvar no banco local (funcionará apenas online):", dbError.message)
        }
      })()
    }

    // Retornar resposta de sucesso baseada na validação do Supabase
    return response
  } catch (error: any) {
    console.error("Erro ao validar chave online:", error)
    
    return {
      valida: false,
      error: "Não foi possível validar a chave. Verifique sua conexão com a internet e tente novamente.",
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

