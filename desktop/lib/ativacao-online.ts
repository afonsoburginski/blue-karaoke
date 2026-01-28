/**
 * Validação de chave de ativação exclusivamente via Supabase.
 * Usado na validação inicial – sem dependência de SQLite/local-db.
 */

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
 * Valida chave de ativação apenas no Supabase (validação inicial).
 * Não toca em SQLite – a persistência local é feita depois via /api/ativacao/salvar-local.
 */
export async function validarChaveOnline(chave: string): Promise<ValidacaoChaveResponse> {
  try {
    const chaveNormalizada = normalizarChave(chave)

    if (!validarFormatoChave(chaveNormalizada)) {
      return {
        valida: false,
        error: "O formato da chave está incorreto. Por favor, use o formato: XXXX-XXXX-XXXX-XXXX",
      }
    }

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

    if (chaveData.tipo === "assinatura") {
      if (chaveData.data_expiracao && new Date(chaveData.data_expiracao) < now) {
        await supabase
          .from("chaves_ativacao")
          .update({ status: "expirada" })
          .eq("id", chaveData.id)
        return {
          valida: false,
          error: "Esta chave de ativação expirou. Entre em contato com o suporte para renovar sua assinatura.",
        }
      }
      // Só exige assinatura ativa se existir registro em assinaturas com status diferente de ativa.
      // Chave com data_expiracao no futuro e status ativa é válida mesmo sem linha em assinaturas.
      if (chaveData.user_id) {
        const { data: assinatura } = await supabase
          .from("assinaturas")
          .select("status")
          .eq("user_id", chaveData.user_id)
          .single()
        if (assinatura && assinatura.status !== "ativa") {
          return {
            valida: false,
            error: "Sua assinatura não está ativa. Entre em contato com o suporte para reativar sua conta.",
          }
        }
      }
    } else if (chaveData.tipo === "maquina") {
      if (chaveData.limite_tempo && chaveData.data_inicio) {
        const horasUsadas =
          (now.getTime() - new Date(chaveData.data_inicio).getTime()) / (1000 * 60 * 60)
        if (horasUsadas >= chaveData.limite_tempo) {
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
        await supabase
          .from("chaves_ativacao")
          .update({
            data_inicio: now.toISOString(),
            usado_em: now.toISOString(),
            ultimo_uso: now.toISOString(),
          })
          .eq("id", chaveData.id)
      } else {
        await supabase
          .from("chaves_ativacao")
          .update({ ultimo_uso: now.toISOString() })
          .eq("id", chaveData.id)
      }
    }

    let userData = null
    if (chaveData.user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("id, name, email, user_type")
        .eq("id", chaveData.user_id)
        .single()
      if (user) {
        userData = { id: user.id, name: user.name, email: user.email }
      }
    }

    let diasRestantes: number | null = null
    if (chaveData.tipo === "assinatura") {
      if (chaveData.user_id) {
        const { data: assinatura } = await supabase
          .from("assinaturas")
          .select("data_fim")
          .eq("user_id", chaveData.user_id)
          .eq("status", "ativa")
          .single()
        if (assinatura?.data_fim) {
          const diffTime = new Date(assinatura.data_fim).getTime() - now.getTime()
          diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        } else if (chaveData.data_expiracao) {
          const diffTime = new Date(chaveData.data_expiracao).getTime() - now.getTime()
          diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        }
      } else if (chaveData.data_expiracao) {
        const diffTime = new Date(chaveData.data_expiracao).getTime() - now.getTime()
        diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }
    }

    let horasRestantes: number | null = null
    if (chaveData.tipo === "maquina" && chaveData.limite_tempo && chaveData.data_inicio) {
      horasRestantes = Math.max(
        0,
        chaveData.limite_tempo -
          (now.getTime() - new Date(chaveData.data_inicio).getTime()) / (1000 * 60 * 60)
      )
    }

    if (chaveData.tipo === "assinatura") {
      await supabase
        .from("chaves_ativacao")
        .update({ ultimo_uso: now.toISOString() })
        .eq("id", chaveData.id)
    }

    return {
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
  } catch (error: unknown) {
    console.error("Erro ao validar chave online:", error)
    return {
      valida: false,
      error: "Não foi possível validar a chave. Verifique sua conexão com a internet e tente novamente.",
    }
  }
}
