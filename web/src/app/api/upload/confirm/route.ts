import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getSupabaseServer } from "@/lib/supabase-server"
import { db, musicas } from "@/lib/db"
import { eq } from "drizzle-orm"

const BUCKET = "files"

/** POST /api/upload/confirm
 * Chamado pelo browser APÓS o upload direto ao Supabase Storage.
 * Registra a música no banco de dados.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const { path, codigo, artista, titulo, size } = body as {
      path?: string
      codigo?: string
      artista?: string
      titulo?: string
      size?: number
    }

    if (!path || !codigo?.trim()) {
      return NextResponse.json({ error: "path e codigo são obrigatórios" }, { status: 400 })
    }

    // Dupla verificação de código (race condition)
    const existing = await db
      .select({ id: musicas.id })
      .from(musicas)
      .where(eq(musicas.codigo, codigo.trim()))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Código "${codigo.trim()}" já existe no catálogo` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServer()
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const filename = path.split("/").pop() || path

    const [newMusica] = await db
      .insert(musicas)
      .values({
        codigo: codigo.trim(),
        artista: (artista?.trim() || "Desconhecido"),
        titulo: (titulo?.trim() || filename),
        arquivo: urlData.publicUrl,
        nomeArquivo: filename,
        tamanho: size ?? 0,
        userId: currentUser.userId,
      })
      .returning()

    return NextResponse.json({ success: true, musica: newMusica }, { status: 201 })
  } catch (err) {
    console.error("[upload/confirm]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
