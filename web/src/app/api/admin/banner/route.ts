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

/** POST /api/admin/banner { path } → confirma upload direto e atualiza URL no banco */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    const { path } = await req.json() as { path?: string }
    if (!path) {
      return NextResponse.json({ error: "path é obrigatório" }, { status: 400 })
    }

    // Obtém a URL pública do caminho informado pelo cliente
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Timestamp no URL para forçar re-download pelo app desktop
    const urlWithTs = `${publicUrl}?v=${Date.now()}`

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
