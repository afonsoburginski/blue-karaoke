import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const BUCKET = "app-assets"
const BANNER_PATH = "banner/background.jpg"
const CONFIG_KEY = "banner_url"

/** GET /api/admin/banner → retorna a URL pública do banner atual */
export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", CONFIG_KEY)
      .single()

    if (error || !data?.valor) {
      return NextResponse.json({ url: null })
    }
    return NextResponse.json({ url: data.valor })
  } catch (err) {
    console.error("[banner GET]", err)
    return NextResponse.json({ url: null })
  }
}

/** POST /api/admin/banner (multipart/form-data com campo "file") → faz upload e atualiza URL */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Use JPEG, PNG ou WebP." },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload com upsert (sobrescreve o arquivo anterior no mesmo caminho)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(BANNER_PATH, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("[banner POST] upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Obtém a URL pública
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(BANNER_PATH)
    const publicUrl = urlData.publicUrl

    // Grava um timestamp no URL para forçar re-download quando atualizado
    const urlWithTs = `${publicUrl}?v=${Date.now()}`

    // Atualiza a tabela configuracoes
    const { error: dbError } = await supabase
      .from("configuracoes")
      .upsert({ chave: CONFIG_KEY, valor: urlWithTs, updated_at: new Date().toISOString() })

    if (dbError) {
      console.error("[banner POST] db error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ url: urlWithTs })
  } catch (err) {
    console.error("[banner POST]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

/** DELETE /api/admin/banner → remove o banner e restaura o padrão */
export async function DELETE() {
  try {
    const supabase = getSupabaseServer()

    await supabase.storage.from(BUCKET).remove([BANNER_PATH])

    await supabase
      .from("configuracoes")
      .upsert({ chave: CONFIG_KEY, valor: "", updated_at: new Date().toISOString() })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[banner DELETE]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
