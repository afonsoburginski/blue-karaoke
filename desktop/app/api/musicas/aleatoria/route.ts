import { NextResponse } from "next/server"
import { localDb, musicasLocal } from "@/lib/db/local-db"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"
import { checkLocalFile } from "@/lib/sync-download"

/**
 * Retorna código de música aleatória entre as que têm arquivo no disco.
 */
export async function GET() {
  try {
    await ensureLocalDbInitialized()
    const todas = await localDb.select({ codigo: musicasLocal.codigo }).from(musicasLocal)
    
    // Filtra só as que têm arquivo de verdade
    const comArquivo = todas.filter((m) => checkLocalFile(m.codigo).exists)
    
    if (comArquivo.length === 0) {
      return NextResponse.json({ codigo: null }, { status: 200 })
    }
    const index = Math.floor(Math.random() * comArquivo.length)
    return NextResponse.json({ codigo: comArquivo[index].codigo })
  } catch (error) {
    console.error("[aleatoria]", error)
    return NextResponse.json({ codigo: null }, { status: 500 })
  }
}
