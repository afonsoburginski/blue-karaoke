import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware – não usa SQLite (Edge não suporta fs/better-sqlite3).
 * O banco local é inicializado sob demanda nas rotas de API que rodam em Node.
 */
export async function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}

