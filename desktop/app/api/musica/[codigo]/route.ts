import { type NextRequest, NextResponse } from "next/server"
import { getMusicaByCodigo } from "@/lib/db-utils"
import { db } from "@/lib/db"
import { musicas } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params

  try {
    const musica = await getMusicaByCodigo(codigo)

    // Se está no banco local, o arquivo existe (download é atômico)
    if (musica) {
      return NextResponse.json({ exists: true, musica })
    } else {
      return NextResponse.json({ exists: false })
    }
  } catch (error) {
    console.error("[v0] Error fetching musica:", error)
    return NextResponse.json({ exists: false, error: "Database error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params

  try {
    const result = await db.delete(musicas).where(eq(musicas.codigo, codigo))
    
    return NextResponse.json({ 
      success: true, 
      message: `Música ${codigo} deletada com sucesso`,
      deleted: result.changes || 0
    })
  } catch (error) {
    console.error("[API] Erro ao deletar música:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, { status: 500 })
  }
}
