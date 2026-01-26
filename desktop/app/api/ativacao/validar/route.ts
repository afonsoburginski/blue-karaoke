import { NextRequest, NextResponse } from "next/server"
import { validarChaveOnline } from "@/lib/ativacao"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chave } = body

    if (!chave) {
      return NextResponse.json(
        { error: "Por favor, informe uma chave de ativação." },
        { status: 400 }
      )
    }

    const resultado = await validarChaveOnline(chave)
    
    if (!resultado.valida) {
      return NextResponse.json(
        { error: resultado.error || "Chave de ativação inválida. Verifique se digitou corretamente." },
        { status: 400 }
      )
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error("Erro ao validar chave:", error)
    return NextResponse.json(
      { error: "Ocorreu um erro ao validar a chave. Por favor, tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
