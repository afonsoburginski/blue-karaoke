"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { navigateFast } from "@/lib/navigation"
import { useRouter } from "next/navigation"

export function Header() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 md:px-12">
      {/* Logo */}
      <Link href="/" className="text-2xl font-bold text-white hover:text-white/80 transition-colors">
        BLUE KARAOKÊS
      </Link>

      {/* Navigation */}
      <nav className="hidden items-center gap-1 lg:flex">
        <div className="flex items-center rounded-full bg-white/10 backdrop-blur-sm px-1 py-1">
          <Link href="/catalogo" className="px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">Músicas</Link>
          <Link href="/preco" className="px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">Preço</Link>
          <Link href="/recursos" className="px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">
            Recursos
          </Link>
          <div className="mx-2 h-4 w-px bg-white/20" />
          {!authLoading && user ? (
            <button
              onClick={() => {
                if (user.slug) {
                  navigateFast(router, `/${user.slug}`)
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 hover:text-white transition-colors rounded-md"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-white/20 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span>Dashboard</span>
            </button>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white px-4 py-2 h-auto">
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 rounded-md px-4 py-2 h-auto">
                  Inscreva-se
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

