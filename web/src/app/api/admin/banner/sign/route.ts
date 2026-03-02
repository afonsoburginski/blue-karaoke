import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getSupabaseServer } from "@/lib/supabase-server"

const BUCKET = "app-assets"
const BANNER_PATH = "banner/background.jpg"

/** POST /api/admin/banner/sign
 * Gera uma signed upload URL para envio do banner diretamente do browser ao Supabase Storage.
 */
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const supabase = getSupabaseServer()

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(BANNER_PATH)

    if (error) {
      console.error("[banner/sign]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    })
  } catch (err) {
    console.error("[banner/sign]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
