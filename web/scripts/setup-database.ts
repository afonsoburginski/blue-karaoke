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

// Extrair informações da URL
const urlMatch = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
if (!urlMatch) {
  console.error("❌ Formato inválido da DATABASE_URL")
  process.exit(1)
}

const [, user, password, host, port, dbName] = urlMatch

async function setupDatabase() {
  console.log("🚀 Configurando banco de dados...")
  console.log(`📊 Host: ${host}:${port}`)
  console.log(`👤 Usuário: ${user}`)
  console.log(`💾 Banco: ${dbName}\n`)

  try {
    // Conectar ao PostgreSQL (sem especificar banco para criar o banco)
    const adminConnectionString = `postgresql://${user}:${password}@${host}:${port}/postgres`
    const adminClient = postgres(adminConnectionString, { max: 1 })

    // Verificar se o banco existe
    const dbCheck = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `

    if (dbCheck.length === 0) {
      console.log(`📝 Criando banco de dados '${dbName}'...`)
      await adminClient.unsafe(`CREATE DATABASE ${dbName}`)
      console.log(`✅ Banco de dados '${dbName}' criado com sucesso!`)
    } else {
      console.log(`✅ Banco de dados '${dbName}' já existe`)
    }

    await adminClient.end()

    // Testar conexão com o banco criado
    console.log("\n🔍 Testando conexão com o banco...")
    const client = postgres(connectionString, { max: 1 })
    const result = await client`SELECT version()`
    console.log(`✅ Conectado ao PostgreSQL: ${result[0].version.split(" ")[0]} ${result[0].version.split(" ")[1]}`)
    await client.end()

    console.log("\n✅ Setup concluído! Agora você pode executar:")
    console.log("   bun run db:migrate")
  } catch (error: any) {
    console.error("\n❌ Erro ao configurar banco de dados:")
    if (error.code === "ECONNREFUSED") {
      console.error("   → PostgreSQL não está rodando")
      console.error("   → Inicie o PostgreSQL e tente novamente")
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

