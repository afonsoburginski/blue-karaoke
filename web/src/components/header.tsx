"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 md:px-12">
      {/* Logo */}
      <Link href="/" className="text-2xl font-bold text-white hover:text-white/80 transition-colors">
        BLUE KARAOKÊS
      </Link>

      {/* Navigation */}
      <nav className="hidden items-center gap-1 lg:flex">
        <div className="flex items-center rounded-full bg-white/10 backdrop-blur-sm px-1 py-1">
          <button className="flex items-center gap-1 px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">
            Características
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">Tarifas</button>
          <button className="flex items-center gap-1 px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">
            Casos de uso
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1 px-4 py-2 text-sm text-white hover:text-white/80 transition-colors">
            Recursos
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-4 flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              Entrar
            </Button>
          </Link>
          <Link href="/cadastro">
            <Button className="bg-white text-black hover:bg-white/90 rounded-md">Inscreva-se</Button>
          </Link>
        </div>
      </nav>
    </header>
  )
}
