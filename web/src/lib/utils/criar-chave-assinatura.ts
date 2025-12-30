/**
 * Utilitário para criar ou atualizar chave de ativação para assinaturas
 * Esta função é idempotente e pode ser chamada múltiplas vezes com segurança
 */

import { db } from "@/lib/db"
import { chavesAtivacao, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { gerarChaveAtivacao } from "./chave-ativacao"

export interface CriarChaveResult {
  sucesso: boolean
  chave?: string
  acao?: "criada" | "atualizada"
  erro?: string
}

/**
 * Cria ou atualiza chave de ativação para uma assinatura
 * Esta função é idempotente e pode ser chamada múltiplas vezes com segurança
 * 
 * @param userId - ID do usuário
 * @param dataExpiracao - Data de expiração da assinatura
 * @returns Resultado da operação com sucesso, chave gerada e ação realizada
 */
export async function criarChaveParaAssinatura(
  userId: string,
  dataExpiracao: Date
): Promise<CriarChaveResult> {
  try {
    // Buscar admin para usar como criadoPor
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1)

    const criadoPor = adminUser?.id || userId

    // Verificar se já existe chave ativa para este usuário
    const [existingKey] = await db
      .select()
      .from(chavesAtivacao)
      .where(
        and(
          eq(chavesAtivacao.userId, userId),
          eq(chavesAtivacao.tipo, "assinatura"),
          eq(chavesAtivacao.status, "ativa")
        )
      )
      .limit(1)

    if (existingKey) {
      // Atualizar chave existente
      await db
        .update(chavesAtivacao)
        .set({
          status: "ativa",
          dataExpiracao: dataExpiracao,
          ultimoUso: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(chavesAtivacao.id, existingKey.id))

      return {
        sucesso: true,
        chave: existingKey.chave,
        acao: "atualizada",
      }
    }

    // Gerar chave única
    let chave = gerarChaveAtivacao()
    let tentativas = 0
    const maxTentativas = 10

    while (tentativas < maxTentativas) {
      const [existing] = await db
        .select()
        .from(chavesAtivacao)
        .where(eq(chavesAtivacao.chave, chave))
        .limit(1)

      if (!existing) {
        break
      }

      chave = gerarChaveAtivacao()
      tentativas++
    }

    if (tentativas >= maxTentativas) {
      return {
        sucesso: false,
        erro: "Não foi possível gerar chave única após múltiplas tentativas",
      }
    }

    // Criar nova chave
    await db.insert(chavesAtivacao).values({
      chave,
      userId,
      tipo: "assinatura",
      status: "ativa",
      dataExpiracao: dataExpiracao,
      criadoPor,
      usadoEm: new Date(),
    })

    return {
      sucesso: true,
      chave,
      acao: "criada",
    }
  } catch (error: any) {
    console.error("Erro ao criar chave de ativação:", error)
    return {
      sucesso: false,
      erro: error.message || "Erro desconhecido",
    }
  }
}

