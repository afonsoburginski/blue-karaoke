import { NextRequest, NextResponse } from "next/server"
import { verificarAtivacao } from "@/lib/ativacao"
import { localDb } from "@/lib/db/local-db"
import { ativacaoLocal } from "@/lib/db/local-schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const resultado = await verificarAtivacao()
    
    // Buscar tipo da chave do banco local
    const [ativacao] = await localDb
      .select()
      .from(ativacaoLocal)
      .where(eq(ativacaoLocal.id, "1"))
      .limit(1)
    
    return NextResponse.json({
      ...resultado,
      tipo: ativacao?.tipo || null,
    })
  } catch (error: any) {
    console.error("Erro ao verificar ativação:", error)
    return NextResponse.json(
      { 
        ativada: false,
        diasRestantes: null,
        horasRestantes: null,
        expirada: true,
        modo: "offline" as const,
        tipo: null,
        error: error.message || "Erro ao verificar ativação"
      },
      { status: 500 }
    )
  }
}
