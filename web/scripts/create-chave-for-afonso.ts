/**
 * Script para criar chave de ativação retroativamente para o usuário afonso
 * Execute: bun run scripts/create-chave-for-afonso.ts
 */

import { db } from "../src/lib/db"
import { users, assinaturas, chavesAtivacao } from "../src/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { gerarChaveAtivacao } from "../src/lib/utils/chave-ativacao"

async function createKeyForAfonso() {
  try {
    console.log("🔍 Buscando usuário afonso...")
    
    // Buscar usuário afonso
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "afonsoburginski@gmail.com"))
      .limit(1)

    if (!user) {
      console.error("❌ Usuário não encontrado")
      process.exit(1)
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.id})`)

    // Buscar assinatura ativa
    const [subscription] = await db
      .select()
      .from(assinaturas)
      .where(eq(assinaturas.userId, user.id))
      .limit(1)

    if (!subscription) {
      console.error("❌ Assinatura não encontrada para este usuário")
      process.exit(1)
    }

    console.log(`✅ Assinatura encontrada: ${subscription.id}`)
    console.log(`   Plano: ${subscription.plano}`)
    console.log(`   Data fim: ${subscription.dataFim}`)

    // Verificar se já existe chave
    const [existingKey] = await db
      .select()
      .from(chavesAtivacao)
      .where(
        and(
          eq(chavesAtivacao.userId, user.id),
          eq(chavesAtivacao.tipo, "assinatura")
        )
      )
      .limit(1)

    if (existingKey) {
      console.log(`⚠️  Chave já existe: ${existingKey.chave}`)
      process.exit(0)
    }

    // Buscar admin para usar como criadoPor
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1)

    if (!adminUser) {
      console.error("❌ Nenhum admin encontrado")
      process.exit(1)
    }

    // Gerar chave única
    let chave = gerarChaveAtivacao()
    let tentativas = 0
    const maxTentativas = 10

    while (tentativas < maxTentativas) {
      const existing = await db
        .select()
        .from(chavesAtivacao)
        .where(eq(chavesAtivacao.chave, chave))
        .limit(1)

      if (existing.length === 0) {
        break
      }

      chave = gerarChaveAtivacao()
      tentativas++
    }

    if (tentativas >= maxTentativas) {
      console.error("❌ Erro ao gerar chave única")
      process.exit(1)
    }

    // Criar chave
    const [newChave] = await db
      .insert(chavesAtivacao)
      .values({
        chave,
        userId: user.id,
        tipo: "assinatura",
        status: "ativa",
        dataExpiracao: subscription.dataFim,
        criadoPor: adminUser.id,
        usadoEm: new Date(),
      })
      .returning()

    console.log(`✅ Chave criada com sucesso!`)
    console.log(`   Chave: ${newChave.chave}`)
    console.log(`   Tipo: ${newChave.tipo}`)
    console.log(`   Data expiração: ${newChave.dataExpiracao}`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Erro:", error)
    process.exit(1)
  }
}

createKeyForAfonso()

