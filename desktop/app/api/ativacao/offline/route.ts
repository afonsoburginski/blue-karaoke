import { NextRequest, NextResponse } from "next/server"
import { localDb } from "@/lib/db/local-db"
import { ativacaoLocal } from "@/lib/db/local-schema"
import { eq } from "drizzle-orm"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

export const runtime = "nodejs"

// Rota otimizada para verificação rápida offline (< 50ms) – usa SQLite local
export async function GET(request: NextRequest) {
  try {
    await ensureLocalDbInitialized()
    
    // Uma única query para obter todos os dados
    const [ativacao] = await localDb
      .select()
      .from(ativacaoLocal)
      .where(eq(ativacaoLocal.id, "1"))
      .limit(1)

    if (!ativacao) {
      return NextResponse.json({
        ativada: false,
        diasRestantes: null,
        horasRestantes: null,
        expirada: false,
        tipo: null,
      })
    }

    const now = Date.now()
    let expirada = false
    let diasRestantes = ativacao.diasRestantes
    let horasRestantes = ativacao.horasRestantes

    // Recalcular baseado no tipo
    if (ativacao.tipo === "assinatura" && ativacao.dataExpiracao) {
      expirada = ativacao.dataExpiracao < now
      if (!expirada) {
        const diffTime = ativacao.dataExpiracao - now
        diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }
    } else if (ativacao.tipo === "maquina" && ativacao.horasRestantes !== null && ativacao.dataValidacao) {
      const tempoDecorrido = (now - ativacao.dataValidacao) / (1000 * 60 * 60)
      horasRestantes = Math.max(0, ativacao.horasRestantes - tempoDecorrido)
      expirada = horasRestantes <= 0
    }

    return NextResponse.json({
      ativada: !expirada,
      diasRestantes,
      horasRestantes,
      expirada,
      chave: ativacao.chave,
      tipo: ativacao.tipo || null,
    })
  } catch (error: any) {
    return NextResponse.json({
      ativada: false,
      diasRestantes: null,
      horasRestantes: null,
      expirada: false,
      tipo: null,
    })
  }
}
