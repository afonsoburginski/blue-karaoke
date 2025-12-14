/**
 * Script para validar variáveis de ambiente
 * Execute: bun run scripts/validate-env.ts
 */
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const requiredVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "NODE_ENV",
]

const optionalVars = [
  "PORT",
  "HOST",
  "MAX_FILE_SIZE",
  "UPLOAD_DIR",
  "CORS_ORIGIN",
  "SESSION_SECRET",
  "API_BASE_URL",
]

console.log("🔍 Validando variáveis de ambiente...\n")

let hasErrors = false

// Validar variáveis obrigatórias
console.log("📋 Variáveis obrigatórias:")
for (const varName of requiredVars) {
  const value = process.env[varName]
  if (!value) {
    console.error(`  ❌ ${varName} - NÃO DEFINIDA`)
    hasErrors = true
  } else {
    // Mascarar valores sensíveis
    const displayValue = varName.includes("SECRET") || varName.includes("PASSWORD")
      ? "***" + value.slice(-4)
      : value.length > 50
      ? value.substring(0, 50) + "..."
      : value
    console.log(`  ✅ ${varName} - ${displayValue}`)
  }
}

// Validar variáveis opcionais
console.log("\n📋 Variáveis opcionais:")
for (const varName of optionalVars) {
  const value = process.env[varName]
  if (value) {
    console.log(`  ✅ ${varName} - ${value}`)
  } else {
    console.log(`  ⚠️  ${varName} - usando valor padrão`)
  }
}

// Validações específicas
console.log("\n🔐 Validações de segurança:")
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length < 32) {
    console.error(`  ❌ JWT_SECRET muito curta (${process.env.JWT_SECRET.length} caracteres). Mínimo: 32`)
    hasErrors = true
  } else {
    console.log(`  ✅ JWT_SECRET tem ${process.env.JWT_SECRET.length} caracteres`)
  }
}

if (process.env.DATABASE_URL) {
  if (!process.env.DATABASE_URL.startsWith("postgresql://")) {
    console.error(`  ❌ DATABASE_URL formato inválido`)
    hasErrors = true
  } else {
    console.log(`  ✅ DATABASE_URL formato válido`)
  }
}

console.log("\n" + "=".repeat(50))
if (hasErrors) {
  console.error("❌ Validação falhou! Corrija os erros acima.")
  process.exit(1)
} else {
  console.log("✅ Todas as variáveis estão configuradas corretamente!")
  process.exit(0)
}

