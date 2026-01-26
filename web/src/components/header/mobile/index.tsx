"use client"

import Link from "next/link"
import { Menu, X, LogIn, UserPlus, DollarSign, Zap, ChevronRight, Music, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { navigateFast } from "@/lib/navigation"
import { useRouter } from "next/navigation"

export function Header() {
  const [open, setOpen] = useState(false)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const menuItems: Array<{
    href: string
    label: string
    icon: typeof LayoutDashboard
    variant: "default" | "outline"
    onClick?: () => void
  }> = !authLoading && user
    ? [
        {
          href: user.slug ? `/${user.slug}` : "#",
          label: "Dashboard",
          icon: LayoutDashboard,
          variant: "default" as const,
          onClick: () => {
            if (user.slug) {
              navigateFast(router, `/${user.slug}`)
            }
            setOpen(false)
          },
        },
      ]
    : [
        { href: "/login", label: "Entrar", icon: LogIn, variant: "default" as const },
        { href: "/cadastro", label: "Inscreva-se", icon: UserPlus, variant: "default" as const },
      ]

  const navItems: Array<{ label: string; icon: typeof DollarSign; href?: string }> = [
    { label: "Músicas", icon: Music, href: "/catalogo" },
    { label: "Preço", icon: DollarSign, href: "/preco" },
    { label: "Recursos", icon: Zap, href: "/recursos" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10">
      {/* Logo */}
      <Link 
        href="/" 
        className="text-lg font-bold text-white hover:text-white/80 transition-colors"
        onClick={() => setOpen(false)}
      >
        BLUE KARAOKÊS
      </Link>

      {/* Mobile Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 active:bg-white/20 transition-all"
            aria-label="Abrir menu"
          >
            {open ? (
              <X className="h-5 w-5 transition-transform duration-200" />
            ) : (
              <Menu className="h-5 w-5 transition-transform duration-200" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-[85vw] max-w-sm bg-gradient-to-b from-black via-black/98 to-black/95 border-l border-white/10 p-0 overflow-y-auto"
        >
          <div className="flex flex-col h-full">
            {/* Header do Menu */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
              <SheetTitle className="text-white text-xl font-bold flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Menu
              </SheetTitle>
            </SheetHeader>

            {/* Ações Principais */}
            <div className="px-6 py-6 space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isDashboard = item.label === "Dashboard" && user
                
                if (isDashboard && "onClick" in item) {
                  return (
                    <button
                      key={item.href}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full",
                        item.variant === "default"
                          ? "bg-[#409fff] hover:bg-[#3090f0] text-white font-medium shadow-lg shadow-[#409fff]/20"
                          : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {isDashboard ? (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs bg-white/20 text-white">
                              {getInitials(user?.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </button>
                  )
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      item.variant === "default"
                        ? "bg-[#409fff] hover:bg-[#3090f0] text-white font-medium shadow-lg shadow-[#409fff]/20"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </Link>
                )
              })}
            </div>

            {/* Navegação */}
            <div className="px-6 pb-6 flex-1">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  if (item.href) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-70 transition-opacity" />
                      </Link>
                    )
                  }
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setOpen(false)
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-70 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 mt-auto">
              <p className="text-xs text-white/40 text-center">
                © 2025 Blue Karaokês
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}

