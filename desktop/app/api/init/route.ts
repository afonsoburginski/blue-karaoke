import { NextResponse } from "next/server"
import { initLocalDb } from "@/lib/db/init-local"

export const runtime = "nodejs"

/**
 * API route para inicializar o banco de dados local
 * GET /api/init - Inicializa o banco local se não existir
 */
export async function GET() {
  try {
    await initLocalDb()
    return NextResponse.json({ 
      success: true,
      message: "Banco de dados local inicializado com sucesso" 
    })
  } catch (error: any) {
    // Se já existe, não é erro
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      return NextResponse.json({ 
        success: true,
        message: "Banco de dados local já existe" 
      })
    }
    
    console.error("Erro ao inicializar banco local:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao inicializar banco de dados local",
      },
      { status: 500 }
    )
  }
}

