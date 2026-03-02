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
 * Uso do bucket: soma tamanho e conta registros diretamente no banco (O(1) com índice).
 * Muito mais rápido do que listar objetos no Supabase Storage página a página.
 */
export async function getStorageBucketUsage(): Promise<StorageUsage> {
  // Import inline para evitar dependência circular com o módulo de db
  const { postgresClient } = await import("@/lib/db")
  const rows = await postgresClient`
    SELECT COUNT(*)::int AS total_objects, COALESCE(SUM(tamanho), 0)::bigint AS total_bytes
    FROM musicas
  `
  const row = rows[0] ?? { total_objects: 0, total_bytes: 0 }
  const totalBytes = Number(row.total_bytes)
  const totalObjects = Number(row.total_objects)

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
