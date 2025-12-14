import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { musicas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import fs from "fs"
import path from "path"

// Pasta do servidor local (pode ser configurada via .env)
const SERVER_MUSICAS_DIR = process.env.SERVER_MUSICAS_DIR || "D:\\Nova pasta"

// Função para obter o diretório do app (funciona no Electron e Node.js normal)
function getAppDataPath() {
  try {
    const { app } = require("electron")
    if (app && !app.isPackaged) {
      // Desenvolvimento
      return process.cwd()
    } else if (app) {
      // Produção - usar userData do Electron
      return app.getPath("userData")
    }
  } catch (e) {
    // Não está no Electron, usar process.cwd()
  }
  return process.cwd()
}

// Diretório onde as músicas serão copiadas (pasta local do app)
const MUSICAS_DIR = path.join(getAppDataPath(), "musicas")

// Garantir que o diretório existe
if (!fs.existsSync(MUSICAS_DIR)) {
  fs.mkdirSync(MUSICAS_DIR, { recursive: true })
}

function extractCodigoFromFilename(filename: string): string | null {
  // Extrai o código do nome do arquivo (ex: 01001.mp4 -> 01001)
  const match = filename.match(/^(\d{5})\.(mp4|MP4|avi|AVI|mov|MOV|mkv|MKV)$/)
  return match ? match[1] : null
}

async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  // Se o arquivo já existe, não copia novamente
  if (fs.existsSync(destPath)) {
    return
  }

  // Copiar arquivo do servidor para a pasta local
  fs.copyFileSync(sourcePath, destPath)
}

export async function POST() {
  try {
    // Verificar se a pasta do servidor existe
    if (!fs.existsSync(SERVER_MUSICAS_DIR)) {
      return NextResponse.json(
        {
          success: false,
          error: `Pasta do servidor não encontrada: ${SERVER_MUSICAS_DIR}`,
        },
        { status: 404 }
      )
    }

    // Listar todos os arquivos na pasta do servidor
    const files = fs.readdirSync(SERVER_MUSICAS_DIR).filter((file) => {
      // Filtrar apenas arquivos de vídeo válidos
      return extractCodigoFromFilename(file) !== null
    })

    // Filtrar apenas músicas que ainda não estão no banco ou não têm arquivo local
    const filesToProcess: string[] = []
    for (const filename of files) {
      const codigo = extractCodigoFromFilename(filename)
      if (!codigo) continue

      const existingMusica = await db.select().from(musicas).where(eq(musicas.codigo, codigo)).limit(1)
      const destPath = path.join(MUSICAS_DIR, filename)

      // Adicionar apenas se não existe no banco ou se o arquivo local não existe
      if (existingMusica.length === 0 || !fs.existsSync(destPath)) {
        filesToProcess.push(filename)
      }
    }

    // Limitar a 5 músicas por sync
    const filesToSync = filesToProcess.slice(0, 5)

    const results = {
      total: files.length,
      available: filesToProcess.length,
      downloaded: 0,
      skipped: 0,
      errors: [] as string[],
      musicas: [] as Array<{ codigo: string; titulo: string; artista: string }>,
    }

    for (const filename of filesToSync) {
      // Extrair código do nome do arquivo
      const codigo = extractCodigoFromFilename(filename)
      if (!codigo) {
        results.errors.push(`Nome de arquivo inválido: ${filename}`)
        continue
      }

      try {
        const sourcePath = path.join(SERVER_MUSICAS_DIR, filename)
        const destPath = path.join(MUSICAS_DIR, filename)

        // Verificar se a música já existe no banco
        const existingMusica = await db.select().from(musicas).where(eq(musicas.codigo, codigo)).limit(1)

        // Se o arquivo já existe localmente, pular
        if (fs.existsSync(destPath)) {
          results.skipped++
          // Se não existe no banco, criar registro mesmo assim
          if (existingMusica.length === 0) {
            const musicaData = {
              codigo,
              artista: `Artista ${codigo}`,
              titulo: `Música ${codigo}`,
              arquivo: `/api/musicas/${filename}`,
              nomeArquivo: filename,
            }
            await db.insert(musicas).values(musicaData)
          }
          continue
        }

        // Copiar o arquivo do servidor para a pasta local
        await copyFile(sourcePath, destPath)
        results.downloaded++

        // Criar ou atualizar registro no banco
        const musicaData = {
          codigo,
          artista: `Artista ${codigo}`,
          titulo: `Música ${codigo}`,
          arquivo: `/api/musicas/${filename}`, // caminho para servir o arquivo via API
          nomeArquivo: filename,
        }

        if (existingMusica.length > 0) {
          await db
            .update(musicas)
            .set({
              ...musicaData,
              atualizadoEm: new Date(),
            })
            .where(eq(musicas.codigo, codigo))
        } else {
          await db.insert(musicas).values(musicaData)
        }

        results.musicas.push({
          codigo,
          titulo: musicaData.titulo,
          artista: musicaData.artista,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        results.errors.push(`Erro ao processar ${filename}: ${errorMessage}`)
        console.error(`[Sync] Erro ao processar ${filename}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync concluído: ${results.downloaded} copiados, ${results.skipped} ignorados, ${results.errors.length} erros`,
      results,
    })
  } catch (error) {
    console.error("[Sync] Erro:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Verificar se a pasta do servidor existe
    if (!fs.existsSync(SERVER_MUSICAS_DIR)) {
      return NextResponse.json(
        {
          success: false,
          error: `Pasta do servidor não encontrada: ${SERVER_MUSICAS_DIR}`,
        },
        { status: 404 }
      )
    }

    // Listar arquivos sem copiar (apenas para visualização)
    const files = fs
      .readdirSync(SERVER_MUSICAS_DIR)
      .filter((file) => extractCodigoFromFilename(file) !== null)

    // Contar quantas músicas estão disponíveis para download (não estão no banco ou não têm arquivo local)
    const filesToProcess: string[] = []
    for (const filename of files) {
      const codigo = extractCodigoFromFilename(filename)
      if (!codigo) continue

      const existingMusica = await db.select().from(musicas).where(eq(musicas.codigo, codigo)).limit(1)
      const destPath = path.join(MUSICAS_DIR, filename)

      // Adicionar apenas se não existe no banco ou se o arquivo local não existe
      if (existingMusica.length === 0 || !fs.existsSync(destPath)) {
        filesToProcess.push(filename)
      }
    }

    const filesInfo = files.slice(0, 100).map((filename) => {
      const filePath = path.join(SERVER_MUSICAS_DIR, filename)
      const stats = fs.statSync(filePath)
      return {
        name: filename,
        codigo: extractCodigoFromFilename(filename),
        size: stats.size,
      }
    })

    return NextResponse.json({
      success: true,
      total: files.length,
      available: filesToProcess.length,
      files: filesInfo,
    })
  } catch (error) {
    console.error("[Sync] Erro ao listar arquivos:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
