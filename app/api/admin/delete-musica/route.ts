import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { musicas, historico } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get("codigo")

    if (!codigo) {
      return NextResponse.json(
        { success: false, error: "Código da música é obrigatório" },
        { status: 400 }
      )
    }

    // Deletar histórico relacionado primeiro (se houver foreign key constraint)
    try {
      await db.delete(historico).where(eq(historico.codigo, codigo))
    } catch (error) {
      // Ignorar se não houver histórico ou se der erro
      console.log("[Delete] Nenhum histórico encontrado ou erro ao deletar histórico:", error)
    }

    // Deletar a música
    const result = await db.delete(musicas).where(eq(musicas.codigo, codigo))

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: `Música com código ${codigo} não encontrada` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Música ${codigo} e seu histórico deletados com sucesso`,
      deleted: result.changes,
    })
  } catch (error) {
    console.error("[Delete] Erro ao deletar música:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

