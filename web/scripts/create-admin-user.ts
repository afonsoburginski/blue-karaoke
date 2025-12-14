/**
 * Script para criar usuário admin inicial
 * Executa em produção: bun run scripts/create-admin-user.ts
 */

import { db, users } from "../src/lib/db"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { createSlug } from "../src/lib/slug"

const ADMIN_EMAIL = "afonsoburginski@gmail.com"
const ADMIN_PASSWORD = "123456789"
const ADMIN_NAME = "Afonso Burginski"

async function createAdminUser() {
  try {
    console.log("🔍 Verificando se usuário admin já existe...")

    // Verificar se usuário já existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1)

    if (existingUser) {
      console.log("✅ Usuário admin já existe!")
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: ${existingUser.role}`)
      
      // Se não for admin, atualizar para admin
      if (existingUser.role !== "admin") {
        console.log("🔄 Atualizando role para admin...")
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, existingUser.id))
        console.log("✅ Role atualizada para admin!")
      }
      
      return
    }

    console.log("📝 Criando usuário admin...")

    // Gerar hash da senha
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    
    // Criar slug
    const slug = createSlug(ADMIN_NAME)

    // Verificar se slug já existe
    const [existingSlug] = await db
      .select()
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1)

    let finalSlug = slug
    if (existingSlug) {
      // Se slug existe, adicionar sufixo
      finalSlug = `${slug}-${Date.now()}`
    }

    // Criar usuário admin
    const [newUser] = await db
      .insert(users)
      .values({
        slug: finalSlug,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        emailVerified: true,
        password: passwordHash,
        role: "admin",
        userType: "subscriber",
        isActive: true,
      })
      .returning()

    console.log("✅ Usuário admin criado com sucesso!")
    console.log(`   ID: ${newUser.id}`)
    console.log(`   Email: ${newUser.email}`)
    console.log(`   Slug: ${newUser.slug}`)
    console.log(`   Role: ${newUser.role}`)
    console.log("\n🔐 Credenciais:")
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Senha: ${ADMIN_PASSWORD}`)
  } catch (error) {
    console.error("❌ Erro ao criar usuário admin:", error)
    process.exit(1)
  } finally {
    // Fechar conexão
    process.exit(0)
  }
}

createAdminUser()

