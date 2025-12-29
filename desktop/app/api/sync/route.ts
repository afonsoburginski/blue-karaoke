import { NextResponse } from "next/server"
import { syncAll } from "@/lib/sync"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

/**
 * API route para sincronizar dados locais com Supabase
 * POST /api/sync - Sincroniza todos os dados não sincronizados
 */
export async function POST() {
  try {
    // Garantir que o banco local está inicializado
    await ensureLocalDbInitialized()
    
    const result = await syncAll()
    
    return NextResponse.json({
      success: true,
      synced: result.synced,
      historico: result.historico,
      musicas: result.musicas,
      errors: result.errors,
    })
  } catch (error: any) {
    console.error("Erro na sincronização:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao sincronizar dados",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sync - Retorna status da sincronização
 */
export async function GET() {
  try {
    // Garantir que o banco local está inicializado
    await ensureLocalDbInitialized()
    
    const { localDb, historicoLocal, musicasLocal } = await import("@/lib/db/local-db")
    const { isNull, count } = await import("drizzle-orm")

    // Contar itens não sincronizados
    const unsyncedHistorico = await localDb
      .select({ count: count() })
      .from(historicoLocal)
      .where(isNull(historicoLocal.syncedAt))

    const unsyncedMusicas = await localDb
      .select({ count: count() })
      .from(musicasLocal)
      .where(isNull(musicasLocal.syncedAt))

    return NextResponse.json({
      success: true,
      unsynced: {
        historico: unsyncedHistorico[0]?.count || 0,
        musicas: unsyncedMusicas[0]?.count || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao verificar status",
      },
      { status: 500 }
    )
  }
}
