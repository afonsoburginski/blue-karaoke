import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { uploadToStorage } from "@/lib/supabase-storage"
import { db, musicas } from "@/lib/db"
import { eq } from "drizzle-orm"

// Função para extrair artista e título do nome do arquivo
// Formato esperado: "codigo - artista - titulo.mp4" ou "codigo.mp4"
function parseFilename(filename: string): { codigo: string; artista: string; titulo: string } {
  // Remove extensão
  const nameWithoutExt = filename.replace(/\.(mp4|avi|mov|mkv)$/i, "")
  
  // Tenta separar por " - "
  const parts = nameWithoutExt.split(" - ")
  
  if (parts.length >= 3) {
    return {
      codigo: parts[0].trim(),
      artista: parts[1].trim(),
      titulo: parts.slice(2).join(" - ").trim(),
    }
  } else if (parts.length === 2) {
    return {
      codigo: parts[0].trim(),
      artista: parts[1].trim(),
      titulo: parts[1].trim(),
    }
  } else {
    // Se não tem separador, usa o nome como código e título
    return {
      codigo: nameWithoutExt.trim(),
      artista: "Desconhecido",
      titulo: nameWithoutExt.trim(),
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Apenas admins podem fazer upload
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para fazer upload" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      )
    }

    const allowedTypes = ["video/mp4", "video/avi", "video/mov", "video/x-matroska", "video/quicktime"]
    if (!allowedTypes.some(type => file.type.includes(type.split("/")[1]) || file.type === type)) {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!["mp4", "avi", "mov", "mkv"].includes(ext || "")) {
        return NextResponse.json(
          { error: "Tipo de arquivo não suportado. Use MP4, AVI, MOV ou MKV." },
          { status: 400 }
        )
      }
    }

    const overrideCodigo = formData.get("codigo") as string | null
    const overrideArtista = formData.get("artista") as string | null
    const overrideTitulo = formData.get("titulo") as string | null
    const parsed = parseFilename(file.name)
    const codigo = (overrideCodigo?.trim() || parsed.codigo) || "sem-codigo"
    const artista = (overrideArtista?.trim() || parsed.artista) || "Desconhecido"
    const titulo = (overrideTitulo?.trim() || parsed.titulo) || file.name

    // Em paralelo: ler arquivo e verificar se código já existe (reduz tempo total)
    const [buffer, existingRows] = await Promise.all([
      file.arrayBuffer().then((bytes) => Buffer.from(bytes)),
      db.select({ id: musicas.id }).from(musicas).where(eq(musicas.codigo, codigo)).limit(1),
    ])

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: `Código "${codigo}" já existe no catálogo` },
        { status: 400 }
      )
    }

    const uploadResult = await uploadToStorage(
      buffer,
      file.name,
      file.type || "video/mp4"
    )

    // Salvar no banco de dados
    const [newMusica] = await db
      .insert(musicas)
      .values({
        codigo,
        artista,
        titulo,
        arquivo: uploadResult.url,
        nomeArquivo: file.name,
        tamanho: uploadResult.size,
        userId: currentUser.userId,
      })
      .returning()

    return NextResponse.json({
      success: true,
      musica: newMusica,
      upload: {
        key: uploadResult.key,
        url: uploadResult.url,
        size: uploadResult.size,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Erro ao fazer upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    )
  }
}

