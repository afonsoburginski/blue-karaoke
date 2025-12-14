import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
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


