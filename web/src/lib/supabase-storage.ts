import { getSupabaseServer } from "./supabase-server"

const BUCKET = "files"
const MUSICAS_PREFIX = "musicas"

export interface StorageUploadResult {
  key: string
  url: string
  size: number
}

export interface StorageUsage {
  totalBytes: number
  totalObjects: number
  totalGb: number
}

/**
 * Retorna a URL pública de um arquivo no bucket "files".
 * Supabase: https://<project>.supabase.co/storage/v1/object/public/files/<path>
 */
export function getStoragePublicUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath
  }
  const path = filePath.startsWith("musicas/") ? filePath : `${MUSICAS_PREFIX}/${filePath}`
  const supabase = getSupabaseServer()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Gera o path no bucket para um arquivo de música (ex: musicas/01587.mp4)
 */
export function getStorageKey(filename: string): string {
  const base = filename.replace(/^musicas\//, "").replace(/^https?:\/\/[^/]+\//, "")
  return `${MUSICAS_PREFIX}/${base}`
}

/**
 * Upload de arquivo para o bucket "files" do Supabase Storage (pasta musicas/).
 */
export async function uploadToStorage(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<StorageUploadResult> {
  const supabase = getSupabaseServer()
  const key = getStorageKey(filename)

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  const url = getStoragePublicUrl(key)
  return { key, url, size: file.length }
}

/**
 * Uso do bucket "files" (soma do tamanho dos objetos na pasta musicas/).
 */
export async function getStorageBucketUsage(): Promise<StorageUsage> {
  const supabase = getSupabaseServer()
  let totalBytes = 0
  let totalObjects = 0
  let offset = 0
  const limit = 1000

  while (true) {
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(MUSICAS_PREFIX, { limit, offset })

    if (error) {
      throw new Error(`Supabase Storage list failed: ${error.message}`)
    }

    if (!files?.length) break

    for (const file of files) {
      if (file.metadata?.size) {
        totalBytes += Number(file.metadata.size)
        totalObjects += 1
      }
    }

    if (files.length < limit) break
    offset += limit
  }

  return {
    totalBytes,
    totalObjects,
    totalGb: totalBytes / (1024 * 1024 * 1024),
  }
}

/**
 * Remove um arquivo do bucket.
 */
export async function deleteFromStorage(key: string): Promise<void> {
  const supabase = getSupabaseServer()
  const path = key.startsWith("musicas/") ? key : `${MUSICAS_PREFIX}/${key}`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`)
  }
}
