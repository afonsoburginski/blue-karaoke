import fs from "fs"
import path from "path"
import * as dotenv from "dotenv"
import { eq } from "drizzle-orm"
import { db, musicas, users } from "@/lib/db"

// Carregar variáveis de ambiente do .env.local (quando rodar via Bun/Node)
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

interface BDEntry {
  codigo: string
  arquivo: string
  artista: string
  musica: string
  inicio?: string
}

async function findAdminUserId() {
  const admins = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1)

  if (!admins.length) {
    console.error("❌ Nenhum usuário admin encontrado na tabela 'users'.")
    console.error("   → Crie pelo menos um usuário admin antes de importar o BD.ini.")
    process.exit(1)
  }

  return admins[0].id
}

function parseBDIni(contents: string): BDEntry[] {
  const lines = contents.split(/\r?\n/)
  const entries: BDEntry[] = []

  let current: Partial<BDEntry> | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    // Nova seção: [01001]
    if (line.startsWith("[") && line.endsWith("]")) {
      // Salvar entrada anterior, se válida
      if (current && current.codigo && current.arquivo && current.artista && current.musica) {
        entries.push(current as BDEntry)
      }

      const codigo = line.slice(1, -1).trim()
      current = { codigo }
      continue
    }

    if (!current) continue

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    const value = line.slice(separatorIndex + 1).trim()

    switch (key) {
      case "arquivo":
        current.arquivo = value
        break
      case "artista":
        current.artista = value
        break
      case "musica":
        current.musica = value
        break
      case "inicio":
        current.inicio = value
        break
      default:
        break
    }
  }

  // Última entrada
  if (current && current.codigo && current.arquivo && current.artista && current.musica) {
    entries.push(current as BDEntry)
  }

  return entries
}

async function main() {
  console.log("🚀 Importando BD.ini do projeto desktop para a base de dados do painel admin...")

  const adminUserId = await findAdminUserId()
  console.log(`👤 Usando usuário admin com id = ${adminUserId} como owner das músicas importadas.\n`)

  // Caminho do BD.ini (a partir da pasta web/)
  const bdPath = path.join(process.cwd(), "..", "desktop", "BD.ini")

  if (!fs.existsSync(bdPath)) {
    console.error("❌ Arquivo BD.ini não encontrado.")
    console.error(`   Caminho esperado: ${bdPath}`)
    process.exit(1)
  }

  console.log(`📄 Lendo arquivo: ${bdPath}`)
  const raw = fs.readFileSync(bdPath, { encoding: "utf-8" })

  const entries = parseBDIni(raw)
  console.log(`📦 Encontradas ${entries.length} entradas no BD.ini\n`)

  let imported = 0
  let skipped = 0

  for (const entry of entries) {
    // Verificar se já existe música com este código
    const existing = await db
      .select({ id: musicas.id })
      .from(musicas)
      .where(eq(musicas.codigo, entry.codigo))
      .limit(1)

    if (existing.length > 0) {
      skipped++
      continue
    }

    await db.insert(musicas).values({
      codigo: entry.codigo,
      artista: entry.artista,
      titulo: entry.musica,
      arquivo: entry.arquivo,
      nomeArquivo: entry.arquivo,
      tamanho: null,
      duracao: null,
      userId: adminUserId,
    })

    imported++
  }

  console.log("✅ Importação concluída!")
  console.log(`   → Importadas: ${imported} músicas novas`)
  console.log(`   → Ignoradas (já existiam): ${skipped} entradas`)
  console.log("\nDica: o campo 'arquivo' deve conter a URL do Supabase Storage (ex: upload pela aplicação).")
}

main().catch((err) => {
  console.error("❌ Erro ao importar BD.ini:", err)
  process.exit(1)
})


