import { type NextRequest, NextResponse } from "next/server"
import { salvarHistorico } from "@/lib/db-utils"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

export async function POST(request: NextRequest) {
  // Garantir que o banco local está inicializado
  await ensureLocalDbInitialized()
  try {
    const body = await request.json()
    const { codigo, musicaId, userId } = body

    if (!codigo) {
      return NextResponse.json({ error: "Missing codigo" }, { status: 400 })
    }

    await salvarHistorico(codigo, musicaId, userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving historico:", error)
    return NextResponse.json({ error: "Failed to save historico" }, { status: 500 })
  }
}
