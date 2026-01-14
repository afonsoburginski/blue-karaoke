import { NextRequest, NextResponse } from "next/server"
import { validarChaveOnline } from "@/lib/ativacao"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chave } = body

    if (!chave) {
      return NextResponse.json(
        { error: "Chave de ativação é obrigatória" },
        { status: 400 }
      )
    }

    const resultado = await validarChaveOnline(chave)
    
    if (!resultado.valida) {
      return NextResponse.json(
        { error: resultado.error || "Chave inválida" },
        { status: 400 }
      )
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error("Erro ao validar chave:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao validar chave" },
      { status: 500 }
    )
  }
}
