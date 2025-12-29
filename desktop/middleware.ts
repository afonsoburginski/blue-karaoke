import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware para garantir que o banco local está inicializado
 * em todas as requisições da API
 */
export async function middleware(request: NextRequest) {
  // Apenas para rotas da API
  if (request.nextUrl.pathname.startsWith("/api")) {
    try {
      // Inicializar banco local de forma assíncrona (não bloqueia)
      const { ensureLocalDbInitialized } = await import("./lib/db/auto-init")
      ensureLocalDbInitialized().catch((error) => {
        console.error("Erro ao inicializar banco local no middleware:", error)
      })
    } catch (error) {
      // Ignorar erros no middleware para não bloquear requisições
      console.error("Erro no middleware:", error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}

