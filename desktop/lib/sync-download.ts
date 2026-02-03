import { eq } from "drizzle-orm"
import { localDb, musicasLocal } from "./db/local-db"
import { db } from "./db"
import { musicas } from "./db/schema"
import { ensureLocalDbInitialized } from "./db/auto-init"
import path from "path"
import fs from "fs"

// Diretório para armazenar músicas baixadas.
// Em prod o Next roda em processo separado: Electron passa BLUE_KARAOKE_USER_DATA; usar esse path (gravável).
const getDownloadPath = (): string => {
  const userData = process.env.BLUE_KARAOKE_USER_DATA
  if (userData) {
    return path.join(userData, "musicas")
  }
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
 * Não insere mais a base inteira no local.
 * O banco local só recebe músicas que já têm arquivo baixado (feito em downloadMusicasBatch).
 */
export async function downloadMusicasMetadata(): Promise<{
  downloaded: number
  errors: string[]
}> {
  // Sincronização é feita no batch: baixar arquivo → depois inserir no local. Nada a fazer aqui.
  return { downloaded: 0, errors: [] }
}

/** Retorna true se a string for URL remota (http/https). */
function isRemoteUrl(str: string): boolean {
  return typeof str === "string" && (str.startsWith("http://") || str.startsWith("https://"))
}

/** Metadados do Supabase para inserir no local após download */
type MusicaMetadata = {
  id: string
  codigo: string
  artista: string
  titulo: string
  arquivo: string
  nomeArquivo?: string | null
  tamanho?: number | null
  duracao?: number | null
  userId?: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Baixa um arquivo de música para armazenamento local.
 * Se metadata for passado e a linha não existir no local, insere após o download (sync: só entra no DB quem tem arquivo).
 */
export async function downloadMusicaFile(
  codigo: string,
  url: string,
  onProgress?: (percent: number) => void,
  metadata?: MusicaMetadata
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  try {
    const downloadDir = ensureDownloadDir()
    const extension = isRemoteUrl(url)
      ? (path.extname(new URL(url).pathname) || ".mp4")
      : (path.extname(url) || ".mp4")
    const localFilename = `${codigo}${extension}`
    const localPath = path.join(downloadDir, localFilename)

    // Verificar se já foi baixado: só inserir no local se tiver metadata e ainda não existir
    if (fs.existsSync(localPath)) {
      const existing = await localDb.select().from(musicasLocal).where(eq(musicasLocal.codigo, codigo)).limit(1)
      if (existing.length === 0 && metadata) {
        await localDb.insert(musicasLocal).values({
          id: metadata.id,
          codigo: metadata.codigo,
          artista: metadata.artista,
          titulo: metadata.titulo,
          arquivo: localPath,
          nomeArquivo: metadata.nomeArquivo ?? null,
          tamanho: metadata.tamanho ?? null,
          duracao: metadata.duracao ?? null,
          userId: metadata.userId ?? null,
          syncedAt: Date.now(),
          createdAt: metadata.createdAt.getTime(),
          updatedAt: Date.now(),
        })
      }
      console.log(`Arquivo ${codigo} já existe localmente`)
      return { success: true, localPath }
    }

    // Se arquivo já é um caminho local, copiar para a pasta de download
    if (!isRemoteUrl(url)) {
      const sourcePath = path.isAbsolute(url) ? url : path.join(downloadDir, url)
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, localPath)
        const buffer = fs.readFileSync(localPath)
        const existing = await localDb.select().from(musicasLocal).where(eq(musicasLocal.codigo, codigo)).limit(1)
        if (existing.length > 0) {
          await localDb.update(musicasLocal).set({ arquivo: localPath, tamanho: buffer.length, updatedAt: Date.now() }).where(eq(musicasLocal.codigo, codigo))
        } else if (metadata) {
          await localDb.insert(musicasLocal).values({
            id: metadata.id,
            codigo: metadata.codigo,
            artista: metadata.artista,
            titulo: metadata.titulo,
            arquivo: localPath,
            nomeArquivo: metadata.nomeArquivo ?? null,
            tamanho: buffer.length,
            duracao: metadata.duracao ?? null,
            userId: metadata.userId ?? null,
            syncedAt: Date.now(),
            createdAt: metadata.createdAt.getTime(),
            updatedAt: Date.now(),
          })
        }
        console.log(`Cópia local concluída: ${codigo}`)
        return { success: true, localPath }
      }
      return { success: false, error: "Arquivo local não encontrado" }
    }

    console.log(`Baixando ${codigo} de ${url}...`)

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

    const buffer = Buffer.concat(chunks)
    fs.writeFileSync(localPath, buffer)

    const existing = await localDb.select().from(musicasLocal).where(eq(musicasLocal.codigo, codigo)).limit(1)
    if (existing.length > 0) {
      await localDb.update(musicasLocal).set({ arquivo: localPath, tamanho: buffer.length, updatedAt: Date.now() }).where(eq(musicasLocal.codigo, codigo))
    } else if (metadata) {
      await localDb.insert(musicasLocal).values({
        id: metadata.id,
        codigo: metadata.codigo,
        artista: metadata.artista,
        titulo: metadata.titulo,
        arquivo: localPath,
        nomeArquivo: metadata.nomeArquivo ?? null,
        tamanho: buffer.length,
        duracao: metadata.duracao ?? null,
        userId: metadata.userId ?? null,
        syncedAt: Date.now(),
        createdAt: metadata.createdAt.getTime(),
        updatedAt: Date.now(),
      })
    }

    console.log(`Download concluído: ${codigo} (${buffer.length} bytes)`)
    return { success: true, localPath }
  } catch (error: any) {
    console.error(`Erro ao baixar ${codigo}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Baixa todas as músicas ainda sem arquivo local: lista vem do Supabase, baixa arquivo e só então insere no local.
 */
export async function downloadAllMusicas(
  onProgress?: (current: number, total: number, codigo: string) => void
): Promise<{
  metadataDownloaded: number
  filesDownloaded: number
  errors: string[]
}> {
  if (!(await isOnline())) {
    return { metadataDownloaded: 0, filesDownloaded: 0, errors: ["Sem conexão com internet"] }
  }
  await ensureLocalDbInitialized()

  const remoteMusicias = await db.select().from(musicas)
  const musicasSemArquivo = remoteMusicias.filter((m) => !checkLocalFile(m.codigo).exists)
  console.log(`${musicasSemArquivo.length} músicas para baixar (arquivo → depois DB)`)

  let filesDownloaded = 0
  const errors: string[] = []

  for (let i = 0; i < musicasSemArquivo.length; i++) {
    const musica = musicasSemArquivo[i]
    if (onProgress) onProgress(i + 1, musicasSemArquivo.length, musica.codigo)
    const meta: MusicaMetadata = {
      id: String(musica.id),
      codigo: musica.codigo,
      artista: musica.artista,
      titulo: musica.titulo,
      arquivo: musica.arquivo,
      nomeArquivo: musica.nomeArquivo ?? null,
      tamanho: musica.tamanho ?? null,
      duracao: musica.duracao ?? null,
      userId: musica.userId ? String(musica.userId) : null,
      createdAt: musica.createdAt,
      updatedAt: musica.updatedAt,
    }
    const result = await downloadMusicaFile(musica.codigo, musica.arquivo, undefined, meta)
    if (result.success) filesDownloaded++
    else if (result.error) errors.push(`${musica.codigo}: ${result.error}`)
  }

  return {
    metadataDownloaded: 0,
    filesDownloaded,
    errors,
  }
}

/**
 * Sincronização: busca no Supabase só as que ainda não têm arquivo local, baixa o arquivo e só então insere no SQLite.
 * Assim o banco local só tem músicas que o usuário realmente pode tocar.
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

  if (!(await isOnline())) {
    return { downloaded: 0, remaining: 0, errors: ["Sem conexão com internet"] }
  }

  const remoteMusicias = await db.select().from(musicas)
  const musicasSemArquivo = remoteMusicias.filter((m) => !checkLocalFile(m.codigo).exists)
  const batch = musicasSemArquivo.slice(0, batchSize)
  const remaining = musicasSemArquivo.length

  console.log(`Sincronizando lote: ${batch.length} de ${remaining} músicas pendentes (arquivo → depois DB)`)

  let downloaded = 0
  const errors: string[] = []

  for (let i = 0; i < batch.length; i++) {
    const musica = batch[i]
    if (onProgress) onProgress(i + 1, batch.length, musica.codigo)

    const meta: MusicaMetadata = {
      id: String(musica.id),
      codigo: musica.codigo,
      artista: musica.artista,
      titulo: musica.titulo,
      arquivo: musica.arquivo,
      nomeArquivo: musica.nomeArquivo ?? null,
      tamanho: musica.tamanho ?? null,
      duracao: musica.duracao ?? null,
      userId: musica.userId ? String(musica.userId) : null,
      createdAt: musica.createdAt,
      updatedAt: musica.updatedAt,
    }
    const result = await downloadMusicaFile(musica.codigo, musica.arquivo, undefined, meta)
    if (result.success) downloaded++
    else if (result.error) errors.push(`${musica.codigo}: ${result.error}`)
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
 * Status offline: total = Supabase, offline = só as que têm arquivo (e estão no DB local).
 */
export async function getOfflineStatus(): Promise<{
  totalMusicas: number
  musicasOffline: number
  musicasOnline: number
  storageUsed: number
}> {
  await ensureLocalDbInitialized()

  const localMusicas = await localDb.select().from(musicasLocal)
  let storageUsed = 0
  for (const m of localMusicas) {
    const c = checkLocalFile(m.codigo)
    if (c.exists) storageUsed += c.size
  }

  let totalMusicas = localMusicas.length
  let musicasOnline = 0
  try {
    const remote = await db.select().from(musicas)
    totalMusicas = remote.length
    musicasOnline = Math.max(0, totalMusicas - localMusicas.length)
  } catch {
    // offline: total = só local
  }

  return {
    totalMusicas,
    musicasOffline: localMusicas.length,
    musicasOnline,
    storageUsed,
  }
}
