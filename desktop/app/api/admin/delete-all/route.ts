import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { musicas, historico } from "@/lib/db/schema"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get("table")

    if (!table || (table !== "musicas" && table !== "historico")) {
      return NextResponse.json(
        { success: false, error: "Tabela inválida. Use 'musicas' ou 'historico'" },
        { status: 400 }
      )
    }

    let deleted = 0

    if (table === "musicas") {
      // Deletar histórico primeiro (se houver foreign key)
      try {
        const histResult = await db.delete(historico)
        console.log("[Delete] Histórico deletado:", histResult.changes)
      } catch (error) {
        console.log("[Delete] Erro ao deletar histórico:", error)
      }

      // Deletar todas as músicas
      const result = await db.delete(musicas)
      deleted = result.changes || 0
    } else {
      // Deletar todo o histórico
      const result = await db.delete(historico)
      deleted = result.changes || 0
    }

    return NextResponse.json({
      success: true,
      message: `${deleted} registros deletados da tabela ${table}`,
      deleted,
    })
  } catch (error) {
    console.error("[Delete] Erro ao deletar:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

