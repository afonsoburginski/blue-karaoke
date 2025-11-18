// Script de teste para a API de sync
const testSync = async () => {
  console.log("🔍 Testando integração com servidor local...\n")

  // Teste 1: Listar arquivos (GET)
  console.log("1️⃣ Testando GET /api/sync (listar arquivos)...")
  try {
    const listResponse = await fetch("http://localhost:3000/api/sync")
    const listData = await listResponse.json()
    
    if (listResponse.ok) {
      console.log("✅ GET funcionando!")
      console.log(`   Total de arquivos encontrados: ${listData.total}`)
      if (listData.files && listData.files.length > 0) {
        console.log(`   Primeiros arquivos:`)
        listData.files.slice(0, 3).forEach((file) => {
          console.log(`   - ${file.name} (código: ${file.codigo || "N/A"})`)
        })
      }
    } else {
      console.log("❌ GET falhou!")
      console.log("   Erro:", listData.error || listData.message)
      return
    }
  } catch (error) {
    console.log("❌ Erro ao fazer GET:", error.message)
    return
  }

  console.log("\n2️⃣ Testando POST /api/sync (baixar arquivos)...")
  try {
    const syncResponse = await fetch("http://localhost:3000/api/sync", {
      method: "POST",
    })
    const syncData = await syncResponse.json()
    
    if (syncResponse.ok) {
      console.log("✅ POST funcionando!")
      console.log(`   ${syncData.message}`)
      if (syncData.results) {
        console.log(`   - Baixados: ${syncData.results.downloaded}`)
        console.log(`   - Ignorados: ${syncData.results.skipped}`)
        console.log(`   - Erros: ${syncData.results.errors.length}`)
      }
    } else {
      console.log("❌ POST falhou!")
      console.log("   Erro:", syncData.error || syncData.message)
    }
  } catch (error) {
    console.log("❌ Erro ao fazer POST:", error.message)
  }
}

testSync()

