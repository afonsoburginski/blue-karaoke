import { NextRequest, NextResponse } from "next/server"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"
import { localDb } from "@/lib/db/local-db"
import { ativacaoLocal } from "@/lib/db/local-schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

/**
 * Salva o resultado da validação (Supabase) no SQLite local.
 * Chamado pelo cliente após sucesso em POST /api/ativacao/validar.
 * SQLite é cópia do schema Supabase para uso offline.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { valida, chave } = body as { valida?: boolean; chave?: { chave: string; tipo: string; diasRestantes: number | null; horasRestantes: number | null; dataExpiracao: string | null } }

    if (!valida || !chave?.chave) {
      return NextResponse.json({ ok: false, error: "Dados inválidos" }, { status: 400 })
    }

    await ensureLocalDbInitialized()

    const nowTimestamp = Date.now()
    const dataExpiracaoTimestamp = chave.dataExpiracao
      ? new Date(chave.dataExpiracao).getTime()
      : null

    const [existing] = await localDb
      .select()
      .from(ativacaoLocal)
      .where(eq(ativacaoLocal.id, "1"))
      .limit(1)

    if (existing) {
      await localDb
        .update(ativacaoLocal)
        .set({
          chave: chave.chave,
          tipo: chave.tipo as "assinatura" | "maquina",
          diasRestantes: chave.diasRestantes,
          horasRestantes: chave.horasRestantes,
          dataExpiracao: dataExpiracaoTimestamp,
          dataValidacao: nowTimestamp,
          updatedAt: nowTimestamp,
        })
        .where(eq(ativacaoLocal.id, "1"))
    } else {
      await localDb.insert(ativacaoLocal).values({
        id: "1",
        chave: chave.chave,
        tipo: chave.tipo as "assinatura" | "maquina",
        diasRestantes: chave.diasRestantes,
        horasRestantes: chave.horasRestantes,
        dataExpiracao: dataExpiracaoTimestamp,
        dataValidacao: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.warn("Erro ao salvar ativação no SQLite local:", error)
    return NextResponse.json(
      { ok: false, error: "Não foi possível salvar localmente" },
      { status: 500 }
    )
  }
}
