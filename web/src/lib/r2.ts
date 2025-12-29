import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3"
import { env } from "./env"

// Cliente S3 compatível com Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

export const R2_BUCKET = env.R2_BUCKET
export const R2_PUBLIC_URL = env.R2_PUBLIC_URL

/**
 * Gera a URL pública do R2 para um arquivo de música
 * @param arquivo Nome do arquivo (ex: "01587.mp4") ou caminho completo (ex: "musicas/01587.mp4")
 * @returns URL pública do R2
 */
export function getR2PublicUrl(arquivo: string): string {
  // Se já for uma URL completa, retornar como está
  if (arquivo.startsWith("http://") || arquivo.startsWith("https://")) {
    return arquivo
  }

  // Se o arquivo já começa com "musicas/", usar direto
  if (arquivo.startsWith("musicas/")) {
    return `${R2_PUBLIC_URL}/${arquivo}`
  }

  // Caso contrário, assumir que está na pasta "musicas/"
  return `${R2_PUBLIC_URL}/musicas/${arquivo}`
}

/**
 * Gera a key do R2 para um arquivo (usado em operações S3)
 * @param arquivo Nome do arquivo (ex: "01587.mp4")
 * @returns Key do R2 (ex: "musicas/01587.mp4")
 */
export function getR2Key(arquivo: string): string {
  // Se já começa com "musicas/", retornar como está
  if (arquivo.startsWith("musicas/")) {
    return arquivo
  }

  // Remover qualquer prefixo de URL se houver
  const filename = arquivo.replace(/^https?:\/\/[^\/]+\//, "").replace(/^musicas\//, "")

  return `musicas/${filename}`
}

export interface R2Usage {
  totalBytes: number
  totalObjects: number
  totalGb: number
}

/**
 * Calcula uso total do bucket (tamanho em bytes, número de objetos, GB arredondado).
 * Útil para alimentar cards de dashboard.
 */
export async function getR2BucketUsage(): Promise<R2Usage> {
  let continuationToken: string | undefined
  let totalBytes = 0
  let totalObjects = 0

  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      ContinuationToken: continuationToken,
    })

    const response = await r2Client.send(command)

    const contents = response.Contents || []
    for (const obj of contents) {
      if (typeof obj.Size === "number") {
        totalBytes += obj.Size
        totalObjects += 1
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  const totalGb = totalBytes / (1024 * 1024 * 1024)

  return {
    totalBytes,
    totalObjects,
    totalGb,
  }
}

/**
 * Obtém um objeto do R2 (para streaming/download)
 * @param key Key do objeto no R2 (ex: "musicas/01587.mp4")
 * @returns Stream do objeto
 */
export async function getR2Object(key: string) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  })

  return await r2Client.send(command)
}
