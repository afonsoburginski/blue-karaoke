import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { env } from "@/lib/env"

const UPLOAD_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR)

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params
    if (!pathSegments?.length) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 })
    }
    const requestedPath = path.join(UPLOAD_DIR, ...pathSegments)
    const resolved = path.resolve(requestedPath)
    if (!resolved.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
    }
    const stream = fs.createReadStream(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const contentType =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".avi"
          ? "video/avi"
          : ext === ".mov"
            ? "video/quicktime"
            : ext === ".mkv"
              ? "video/x-matroska"
              : "application/octet-stream"
    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
      },
    })
  } catch (error) {
    console.error("Erro ao servir arquivo:", error)
    return NextResponse.json({ error: "Erro ao servir arquivo" }, { status: 500 })
  }
}
