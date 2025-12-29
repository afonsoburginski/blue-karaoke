import fs from "fs"
import path from "path"
import * as dotenv from "dotenv"
import { eq } from "drizzle-orm"
import { db, musicas } from "@/lib/db"

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

interface BDEntry {
  codigo: string
  arquivo: string
  artista: string
  musica: string
  inicio?: string
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

    // Verificar se devemos parar
    if (line.includes(`arquivo=${stopAtFile}`)) {
      if (current && current.codigo && current.arquivo && current.artista && current.musica) {
        entries.push(current as BDEntry)
      }
      shouldStop = true
      break
    }

    // Nova seção: [01001]
    if (line.startsWith("[") && line.endsWith("]")) {
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
        if (value === stopAtFile) {
          shouldStop = true
        }
        break
      case "artista":
        current.artista = value
        break
      case "musica":
        current.musica = value
        if (shouldStop && current.codigo && current.arquivo && current.artista && current.musica) {
          entries.push(current as BDEntry)
          return entries
        }
        break
      case "inicio":
        current.inicio = value
        if (shouldStop && current.codigo && current.arquivo && current.artista && current.musica) {
          entries.push(current as BDEntry)
          return entries
        }
        break
      default:
        break
    }
  }

  if (!shouldStop && current && current.codigo && current.arquivo && current.artista && current.musica) {
    entries.push(current as BDEntry)
  }

  return entries
}

async function main() {
  console.log("🚀 Corrigindo encoding das músicas no banco de dados...\n")

  // Caminho do BD.ini
  const bdPath = path.join(process.cwd(), "BD.ini")

  if (!fs.existsSync(bdPath)) {
    console.error("❌ Arquivo BD.ini não encontrado.")
    console.error(`   Caminho esperado: ${bdPath}`)
    process.exit(1)
  }

  console.log(`📄 Lendo arquivo: ${bdPath}`)
  
  // Ler o arquivo como buffer e converter de latin1 para utf-8
  const buffer = fs.readFileSync(bdPath)
  
  // Converter de latin1 (ISO-8859-1) para UTF-8
  // O Node.js não tem suporte nativo para latin1, então vamos fazer manualmente
  // ou usar uma abordagem diferente
  let raw: string
  
  try {
    // Tentar primeiro como UTF-8
    raw = buffer.toString("utf-8")
    
    // Se tiver caracteres de substituição (), tentar latin1
    if (raw.includes("")) {
      console.log("   ⚠️  Detectado encoding incorreto, convertendo de latin1...")
      // Converter byte por byte de latin1 para utf-8
      raw = buffer.toString("latin1")
    }
  } catch (error) {
    // Se falhar, usar latin1 diretamente
    console.log("   ⚠️  Usando encoding latin1...")
    raw = buffer.toString("latin1")
  }

  const stopAtFile = "01600.mp4"
  const entries = parseBDIni(raw, stopAtFile)
  console.log(`📦 Encontradas ${entries.length} entradas no BD.ini (até ${stopAtFile})\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const entry of entries) {
    try {
      // Buscar música existente
      const [existing] = await db
        .select()
        .from(musicas)
        .where(eq(musicas.codigo, entry.codigo))
        .limit(1)

      if (!existing) {
        skipped++
        continue
      }

      // Verificar se precisa atualizar (comparar normalizado)
      const artistaNormalized = entry.artista.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const existingArtistaNormalized = existing.artista.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      
      const musicaNormalized = entry.musica.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const existingTituloNormalized = existing.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      // Se já está correto, pular
      if (
        existing.artista === entry.artista &&
        existing.titulo === entry.musica
      ) {
        skipped++
        continue
      }

      // Atualizar com dados corretos
      await db
        .update(musicas)
        .set({
          artista: entry.artista,
          titulo: entry.musica,
          updatedAt: new Date(),
        })
        .where(eq(musicas.codigo, entry.codigo))

      updated++

      if (updated % 100 === 0) {
        console.log(`   → ${updated} músicas atualizadas...`)
      }
    } catch (error: any) {
      errors++
      console.error(`   ❌ Erro ao atualizar ${entry.codigo}: ${error.message}`)
    }
  }

  console.log("\n✅ Correção concluída!")
  console.log(`   → Atualizadas: ${updated} músicas`)
  console.log(`   → Ignoradas (já estavam corretas): ${skipped} músicas`)
  if (errors > 0) {
    console.log(`   → Erros: ${errors} músicas`)
  }
}

main().catch((err) => {
  console.error("❌ Erro ao corrigir encoding:", err)
  process.exit(1)
})

