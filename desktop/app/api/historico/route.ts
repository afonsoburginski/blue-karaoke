import { type NextRequest, NextResponse } from "next/server"
import { salvarHistorico } from "@/lib/db-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, nota } = body

    if (!codigo || nota === undefined) {
      return NextResponse.json({ error: "Missing codigo or nota" }, { status: 400 })
    }

    await salvarHistorico(codigo, nota)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving historico:", error)
    return NextResponse.json({ error: "Failed to save historico" }, { status: 500 })
  }
}
