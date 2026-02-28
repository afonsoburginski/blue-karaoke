import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy (Next.js 16): limpa cookies de sessão duplicados/stale que causam 431.
 *
 * O better-auth com cookieCache=true gerava cookies de 3-5 KB. Após desativar
 * o cookieCache, sessões antigas no navegador ainda carregam esses cookies volumosos.
 * Este proxy os remove na primeira request, forçando re-login limpo.
 */
export function proxy(req: NextRequest) {
  const cookies = req.cookies.getAll()

  // Identifica cookies de sessão do better-auth (prefixo "better-auth.")
  const sessionCookies = cookies.filter(
    (c) => c.name.startsWith("better-auth.") || c.name.startsWith("__Secure-better-auth.")
  )

  // Se há mais de 2 cookies de sessão (token + um extra), provavelmente há stale cookies.
  // Remove todos e redireciona para login para gerar uma sessão limpa.
  if (sessionCookies.length > 2) {
    const response = NextResponse.redirect(new URL("/login", req.url))
    for (const cookie of sessionCookies) {
      response.cookies.delete(cookie.name)
    }
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
