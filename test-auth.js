// Script para obter o refresh token
const testAuth = async () => {
  console.log("🔐 Configurando autenticação OAuth2...\n")

  try {
    // 1. Obter URL de autenticação
    console.log("1️⃣ Obtendo URL de autenticação...")
    const loginResponse = await fetch("http://localhost:3000/api/auth/login")
    const loginData = await loginResponse.json()

    if (!loginResponse.ok) {
      console.log("❌ Erro ao obter URL de autenticação:", loginData.error)
      return
    }

    console.log("✅ URL de autenticação obtida!")
    console.log("\n📋 Próximos passos:")
    console.log("1. Abra esta URL no navegador:")
    console.log(`   ${loginData.authUrl}`)
    console.log("\n2. Faça login com sua conta Google")
    console.log("3. Autorize o acesso ao Google Drive")
    console.log("4. Você será redirecionado e verá o refresh_token na URL")
    console.log("5. Copie o refresh_token e adicione ao arquivo .env")
    console.log("\n💡 Dica: O refresh_token aparecerá na URL após a autorização")
  } catch (error) {
    console.log("❌ Erro:", error.message)
  }
}

testAuth()

