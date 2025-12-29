import postgres from "postgres"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL

if (!connectionString) {
  console.error("❌ DATABASE_URL ou DIRECT_URL não está definida no .env.local")
  process.exit(1)
}

async function setupDatabase() {
  console.log("🚀 Testando conexão com o banco de dados...")
  
  // Verificar se é Supabase (não precisa criar banco)
  const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("pooler.supabase.com")
  
  if (isSupabase) {
    console.log("📊 Detectado Supabase - apenas testando conexão...")
  }

  try {
    // Testar conexão
    console.log("\n🔍 Testando conexão...")
    const client = postgres(connectionString, { max: 1 })
    const result = await client`SELECT version()`
    console.log(`✅ Conectado ao PostgreSQL: ${result[0].version.split(" ")[0]} ${result[0].version.split(" ")[1]}`)
    
    // Verificar se as tabelas existem
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `
    
    if (tables.length > 0) {
      console.log(`\n📋 Tabelas encontradas: ${tables.length}`)
      tables.forEach((t: any) => console.log(`   - ${t.table_name}`))
    } else {
      console.log("\n⚠️  Nenhuma tabela encontrada. Execute: bun run db:migrate")
    }
    
    await client.end()

    console.log("\n✅ Setup concluído!")
    if (tables.length === 0) {
      console.log("   Execute: bun run db:migrate")
    }
  } catch (error: any) {
    console.error("\n❌ Erro ao conectar ao banco de dados:")
    if (error.code === "ECONNREFUSED") {
      console.error("   → Não foi possível conectar ao servidor")
      console.error("   → Verifique se as credenciais estão corretas")
    } else if (error.code === "28P01") {
      console.error("   → Credenciais inválidas (usuário/senha)")
      console.error("   → Verifique o arquivo .env.local")
    } else {
      console.error(`   → ${error.message}`)
    }
    process.exit(1)
  }
}

setupDatabase()

