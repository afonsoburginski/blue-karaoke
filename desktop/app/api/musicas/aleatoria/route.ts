import { NextResponse } from "next/server"
import { localDb, musicasLocal } from "@/lib/db/local-db"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

/**
 * Retorna código de música aleatória do banco local.
 * Se está no banco, o arquivo existe (download é atômico).
 */
export async function GET() {
  try {
    await ensureLocalDbInitialized()
    const todas = await localDb.select({ codigo: musicasLocal.codigo }).from(musicasLocal)
    
    if (todas.length === 0) {
      return NextResponse.json({ codigo: null }, { status: 200 })
    }
    const index = Math.floor(Math.random() * todas.length)
    return NextResponse.json({ codigo: todas[index].codigo })
  } catch (error) {
    console.error("[aleatoria]", error)
    return NextResponse.json({ codigo: null }, { status: 500 })
  }
}
