import postgres from "postgres"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  console.error("❌ DATABASE_URL não está definida no .env.local")
  process.exit(1)
}

async function testConnection() {
  console.log("🔍 Testando conexão com PostgreSQL...")
  console.log(`📡 URL: ${connectionString.replace(/:[^:@]+@/, ":****@")}`)
  
  try {
    const client = postgres(connectionString, { max: 1 })
    
    // Testar conexão
    const result = await client`SELECT version()`
    console.log("✅ Conexão estabelecida com sucesso!")
    console.log(`📊 Versão do PostgreSQL: ${result[0].version}`)
    
    // Verificar se o banco existe
    const dbName = connectionString.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)?.[5]
    if (dbName) {
      const dbCheck = await client`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
      if (dbCheck.length === 0) {
        console.log(`\n⚠️  Banco de dados '${dbName}' não existe!`)
        console.log(`\n📝 Para criar o banco, execute no psql:`)
        console.log(`   CREATE DATABASE ${dbName};`)
      } else {
        console.log(`✅ Banco de dados '${dbName}' existe`)
      }
    }
    
    await client.end()
    console.log("\n✅ Teste de conexão concluído com sucesso!")
  } catch (error: any) {
    console.error("\n❌ Erro ao conectar ao PostgreSQL:")
    if (error.code === "ECONNREFUSED") {
      console.error("   → PostgreSQL não está rodando ou porta incorreta")
      console.error("   → Verifique se o PostgreSQL está iniciado")
    } else if (error.code === "28P01") {
      console.error("   → Credenciais inválidas (usuário/senha)")
    } else if (error.code === "3D000") {
      console.error("   → Banco de dados não existe")
    } else {
      console.error(`   → ${error.message}`)
    }
    console.error(`\n💡 Dica: Verifique o arquivo .env.local`)
    process.exit(1)
  }
}

testConnection()

