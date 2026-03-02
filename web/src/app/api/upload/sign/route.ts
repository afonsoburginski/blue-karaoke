import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getSupabaseServer } from "@/lib/supabase-server"
import { db, musicas } from "@/lib/db"
import { eq } from "drizzle-orm"

const BUCKET = "files"

/** POST /api/upload/sign
 * Gera uma signed upload URL para envio direto do browser ao Supabase Storage.
 * Valida autenticação e verifica duplicidade de código antes de emitir a URL.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão para fazer upload" }, { status: 403 })
    }

    const body = await request.json()
    const { filename, codigo } = body as { filename?: string; codigo?: string }

    if (!filename) {
      return NextResponse.json({ error: "filename é obrigatório" }, { status: 400 })
    }
    if (!codigo?.trim()) {
      return NextResponse.json({ error: "codigo é obrigatório" }, { status: 400 })
    }

    // Verificar duplicidade antes de gerar URL
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
    // Usa o mesmo padrão de path do supabase-storage.ts
    const storagePath = `musicas/${filename}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath)

    if (error) {
      console.error("[upload/sign]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    })
  } catch (err) {
    console.error("[upload/sign]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
