import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Mesmo path do sync-download: em prod usa BLUE_KARAOKE_USER_DATA (passado pelo Electron).
function getMusicasPath(): string {
  const userData = process.env.BLUE_KARAOKE_USER_DATA
  if (userData) return path.join(userData, "musicas")
  return path.join(process.cwd(), "musicas")
}

// Extensões de vídeo suportadas
const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".wmv"]

// Encontrar arquivo de vídeo com qualquer extensão
function findVideoFile(musicasPath: string, codigo: string): { path: string; ext: string } | null {
  for (const ext of VIDEO_EXTENSIONS) {
    const videoPath = path.join(musicasPath, `${codigo}${ext}`)
    if (fs.existsSync(videoPath)) {
      return { path: videoPath, ext }
    }
  }
  return null
}

// Mapear extensão para MIME type
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
  }
  return mimeTypes[ext] || "video/mp4"
}

// Servir vídeos locais da pasta musicas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params

  const musicasPath = getMusicasPath()
  const videoFile = findVideoFile(musicasPath, codigo)
  
  // Verificar se o arquivo existe
  if (!videoFile) {
    return NextResponse.json(
      { error: "Vídeo não encontrado" },
      { status: 404 }
    )
  }
  
  const videoPath = videoFile.path
  const mimeType = getMimeType(videoFile.ext)
  
  // Obter informações do arquivo
  const stat = fs.statSync(videoPath)
  const fileSize = stat.size
  
  // Verificar se é uma requisição de range (streaming)
  const range = request.headers.get("range")
  
  if (range) {
    // Parse range
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1
    
    // Ler o chunk do arquivo
    const buffer = Buffer.alloc(chunkSize)
    const fd = fs.openSync(videoPath, "r")
    fs.readSync(fd, buffer, 0, chunkSize, start)
    fs.closeSync(fd)
    
    return new Response(buffer, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": mimeType,
      },
    })
  }
  
  // Se não for range request, enviar arquivo inteiro
  const buffer = fs.readFileSync(videoPath)
  
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
    },
  })
}
