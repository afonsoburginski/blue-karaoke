import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Variáveis de ambiente do R2 não configuradas")
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const filename = formData.get("filename") as string || file.name

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    const bucket = process.env.R2_BUCKET || "blue-karaoke"
    const key = `musicas/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const s3Client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })

    await s3Client.send(command)

    const r2Url = `${process.env.R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      success: true,
      message: "Arquivo enviado com sucesso",
      key,
      url: r2Url,
    })
  } catch (error) {
    console.error("Erro no upload:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido ao fazer upload",
      },
      { status: 500 }
    )
  }
}

