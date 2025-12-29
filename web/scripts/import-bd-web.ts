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
    // Se não houver admin, buscar qualquer usuário ou criar um sistema
    const anyUser = await db
      .select({ id: users.id })
      .from(users)
      .limit(1)

    if (!anyUser.length) {
      console.error("❌ Nenhum usuário encontrado na tabela 'users'.")
      console.error("   → Crie pelo menos um usuário antes de importar o BD.ini.")
      process.exit(1)
    }

    console.log("⚠️  Nenhum admin encontrado, usando primeiro usuário disponível.")
    return anyUser[0].id
  }

  return admins[0].id
}

function parseBDIni(contents: string, stopAtFile: string): BDEntry[] {
  const lines = contents.split(/\r?\n/)
  const entries: BDEntry[] = []

  let current: Partial<BDEntry> | null = null
  let shouldStop = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    // Não verificar stop aqui, vamos processar normalmente e parar depois

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
        // Verificar se é o arquivo de parada
        if (value === stopAtFile) {
          shouldStop = true
        }
        break
      case "artista":
        current.artista = value
        break
      case "musica":
        current.musica = value
        // Se já temos todos os campos necessários e é o arquivo de parada, podemos parar
        if (shouldStop && current.codigo && current.arquivo && current.artista && current.musica) {
          entries.push(current as BDEntry)
          return entries
        }
        break
      case "inicio":
        current.inicio = value
        // Se já temos todos os campos necessários e é o arquivo de parada, podemos parar
        if (shouldStop && current.codigo && current.arquivo && current.artista && current.musica) {
          entries.push(current as BDEntry)
          return entries
        }
        break
      default:
        break
    }
  }

  // Se não parou antes, adicionar última entrada
  if (!shouldStop && current && current.codigo && current.arquivo && current.artista && current.musica) {
    entries.push(current as BDEntry)
  }

  return entries
}

async function main() {
  console.log("🚀 Importando BD.ini (web) até 01600.mp4 para a base de dados...")

  const adminUserId = await findAdminUserId()
  console.log(`👤 Usando usuário com id = ${adminUserId} como owner das músicas importadas.\n`)

  // Caminho do BD.ini na pasta web
  const bdPath = path.join(process.cwd(), "BD.ini")

  if (!fs.existsSync(bdPath)) {
    console.error("❌ Arquivo BD.ini não encontrado.")
    console.error(`   Caminho esperado: ${bdPath}`)
    process.exit(1)
  }

  console.log(`📄 Lendo arquivo: ${bdPath}`)
  const raw = fs.readFileSync(bdPath, { encoding: "utf-8" })

  const stopAtFile = "01600.mp4"
  const entries = parseBDIni(raw, stopAtFile)
  console.log(`📦 Encontradas ${entries.length} entradas no BD.ini (até ${stopAtFile})\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const entry of entries) {
    try {
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
      
      // Log a cada 100 músicas importadas
      if (imported % 100 === 0) {
        console.log(`   → ${imported} músicas importadas...`)
      }
    } catch (error: any) {
      errors++
      console.error(`   ❌ Erro ao importar ${entry.codigo}: ${error.message}`)
    }
  }

  console.log("\n✅ Importação concluída!")
  console.log(`   → Importadas: ${imported} músicas novas`)
  console.log(`   → Ignoradas (já existiam): ${skipped} entradas`)
  if (errors > 0) {
    console.log(`   → Erros: ${errors} entradas`)
  }
  console.log("\nDica: depois você pode atualizar o campo 'arquivo' para apontar para a URL/KEY no R2.")
}

main().catch((err) => {
  console.error("❌ Erro ao importar BD.ini:", err)
  process.exit(1)
})

