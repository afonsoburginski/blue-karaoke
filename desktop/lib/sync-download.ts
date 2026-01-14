import { eq } from "drizzle-orm"
import { localDb, musicasLocal } from "./db/local-db"
import { db } from "./db"
import { musicas } from "./db/schema"
import { ensureLocalDbInitialized } from "./db/auto-init"
import { v4 as uuidv4 } from "uuid"
import path from "path"
import fs from "fs"

// Diretório para armazenar músicas baixadas
const getDownloadPath = () => {
  if (process.env.NODE_ENV === "development") {
    return path.join(process.cwd(), "musicas")
  }
  try {
    const { app } = require("electron")
    return path.join(app.getPath("userData"), "musicas")
  } catch {
    return path.join(process.cwd(), "musicas")
  }
}

/**
 * Garante que o diretório de download existe
 */
function ensureDownloadDir(): string {
  const downloadPath = getDownloadPath()
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true })
  }
  return downloadPath
}

/**
 * Verifica se há conexão com a internet/Supabase
 */
async function isOnline(): Promise<boolean> {
  try {
    await db.select().from(musicas).limit(1)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Baixa metadados das músicas do Supabase para SQLite local
 */
export async function downloadMusicasMetadata(): Promise<{
  downloaded: number
  errors: string[]
}> {
  if (!(await isOnline())) {
    console.log("Offline: não é possível baixar metadados")
    return { downloaded: 0, errors: ["Sem conexão com internet"] }
  }

  await ensureLocalDbInitialized()

  try {
    // Buscar todas as músicas do Supabase
    const remoteMusicias = await db.select().from(musicas)

    console.log(`Encontradas ${remoteMusicias.length} músicas no servidor`)

    let downloaded = 0
    const errors: string[] = []

    for (const musica of remoteMusicias) {
      try {
        // Verificar se já existe localmente
        const existing = await localDb
          .select()
          .from(musicasLocal)
          .where(eq(musicasLocal.codigo, musica.codigo))
          .limit(1)

        if (existing.length === 0) {
          // Inserir no SQLite local
          await localDb.insert(musicasLocal).values({
            id: musica.id,
            codigo: musica.codigo,
            artista: musica.artista,
            titulo: musica.titulo,
            arquivo: musica.arquivo,
            nomeArquivo: musica.nomeArquivo || null,
            tamanho: musica.tamanho || null,
            duracao: musica.duracao || null,
            userId: musica.userId || null,
            syncedAt: Date.now(),
            createdAt: musica.createdAt.getTime(),
            updatedAt: musica.updatedAt.getTime(),
          })
          downloaded++
        }
      } catch (error: any) {
        if (!error.message?.includes("UNIQUE constraint")) {
          errors.push(`Erro ao salvar ${musica.codigo}: ${error.message}`)
        }
      }
    }

    console.log(`Metadados baixados: ${downloaded} músicas`)
    return { downloaded, errors }
  } catch (error: any) {
    console.error("Erro ao baixar metadados:", error)
    return { downloaded: 0, errors: [error.message] }
  }
}

/**
 * Baixa um arquivo de música para armazenamento local
 */
export async function downloadMusicaFile(
  codigo: string,
  url: string,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  try {
    const downloadDir = ensureDownloadDir()
    
    // Extrair extensão do arquivo da URL
    const urlObj = new URL(url)
    const extension = path.extname(urlObj.pathname) || ".mp4"
    const localFilename = `${codigo}${extension}`
    const localPath = path.join(downloadDir, localFilename)

    // Verificar se já foi baixado
    if (fs.existsSync(localPath)) {
      console.log(`Arquivo ${codigo} já existe localmente`)
      return { success: true, localPath }
    }

    console.log(`Baixando ${codigo} de ${url}...`)

    // Fazer download do arquivo
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentLength = response.headers.get("content-length")
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("Não foi possível ler o stream do arquivo")
    }

    const chunks: Uint8Array[] = []
    let receivedSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      receivedSize += value.length

      if (totalSize > 0 && onProgress) {
        onProgress(Math.round((receivedSize / totalSize) * 100))
      }
    }

    // Combinar chunks e salvar arquivo
    const buffer = Buffer.concat(chunks)
    fs.writeFileSync(localPath, buffer)

    // Atualizar SQLite com caminho local
    await localDb
      .update(musicasLocal)
      .set({ 
        arquivo: localPath,
        tamanho: buffer.length,
        updatedAt: Date.now(),
      })
      .where(eq(musicasLocal.codigo, codigo))

    console.log(`Download concluído: ${codigo} (${buffer.length} bytes)`)
    return { success: true, localPath }
  } catch (error: any) {
    console.error(`Erro ao baixar ${codigo}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Baixa todas as músicas (metadados + arquivos)
 */
export async function downloadAllMusicas(
  onProgress?: (current: number, total: number, codigo: string) => void
): Promise<{
  metadataDownloaded: number
  filesDownloaded: number
  errors: string[]
}> {
  // Primeiro baixar metadados
  const metadataResult = await downloadMusicasMetadata()
  
  // Buscar todas as músicas locais que ainda têm URL remota
  const musicasParaBaixar = await localDb
    .select()
    .from(musicasLocal)

  // Filtrar músicas que ainda não foram baixadas localmente
  const musicasComUrlRemota = musicasParaBaixar.filter(m => {
    const localCheck = checkLocalFile(m.codigo)
    return !localCheck.exists
  })

  console.log(`${musicasComUrlRemota.length} músicas para baixar arquivos`)

  let filesDownloaded = 0
  const errors: string[] = [...metadataResult.errors]

  for (let i = 0; i < musicasComUrlRemota.length; i++) {
    const musica = musicasComUrlRemota[i]
    
    if (onProgress) {
      onProgress(i + 1, musicasComUrlRemota.length, musica.codigo)
    }

    const result = await downloadMusicaFile(musica.codigo, musica.arquivo)
    
    if (result.success) {
      filesDownloaded++
    } else if (result.error) {
      errors.push(`${musica.codigo}: ${result.error}`)
    }
  }

  return {
    metadataDownloaded: metadataResult.downloaded,
    filesDownloaded,
    errors,
  }
}

/**
 * Baixa músicas em lote (para download em background)
 */
export async function downloadMusicasBatch(
  batchSize: number = 5,
  onProgress?: (current: number, total: number, codigo: string) => void
): Promise<{
  downloaded: number
  remaining: number
  errors: string[]
}> {
  await ensureLocalDbInitialized()
  
  // Buscar músicas que ainda não foram baixadas
  const allMusicas = await localDb.select().from(musicasLocal)
  
  const musicasParaBaixar = allMusicas.filter(m => {
    const localCheck = checkLocalFile(m.codigo)
    return !localCheck.exists
  })

  const remaining = musicasParaBaixar.length
  const musicasBatch = musicasParaBaixar.slice(0, batchSize)
  
  console.log(`Baixando lote de ${musicasBatch.length} de ${remaining} músicas pendentes`)

  let downloaded = 0
  const errors: string[] = []

  for (let i = 0; i < musicasBatch.length; i++) {
    const musica = musicasBatch[i]
    
    if (onProgress) {
      onProgress(i + 1, musicasBatch.length, musica.codigo)
    }

    const result = await downloadMusicaFile(musica.codigo, musica.arquivo)
    
    if (result.success) {
      downloaded++
    } else if (result.error) {
      errors.push(`${musica.codigo}: ${result.error}`)
    }
  }

  return {
    downloaded,
    remaining: remaining - downloaded,
    errors,
  }
}

/**
 * Verifica se um arquivo de música existe localmente
 */
function checkLocalFile(codigo: string): { exists: boolean; size: number } {
  const downloadDir = getDownloadPath()
  const localPath = path.join(downloadDir, `${codigo}.mp4`)
  
  if (fs.existsSync(localPath)) {
    try {
      const stats = fs.statSync(localPath)
      return { exists: true, size: stats.size }
    } catch {
      return { exists: false, size: 0 }
    }
  }
  return { exists: false, size: 0 }
}

/**
 * Verifica status de download offline
 */
export async function getOfflineStatus(): Promise<{
  totalMusicas: number
  musicasOffline: number
  musicasOnline: number
  storageUsed: number
}> {
  await ensureLocalDbInitialized()
  
  const allMusicas = await localDb.select().from(musicasLocal)
  
  let musicasOffline = 0
  let musicasOnline = 0
  let storageUsed = 0

  for (const musica of allMusicas) {
    // Verificar se o arquivo existe localmente pelo código
    const localCheck = checkLocalFile(musica.codigo)
    
    if (localCheck.exists) {
      musicasOffline++
      storageUsed += localCheck.size
    } else {
      musicasOnline++
    }
  }

  return {
    totalMusicas: allMusicas.length,
    musicasOffline,
    musicasOnline,
    storageUsed,
  }
}
