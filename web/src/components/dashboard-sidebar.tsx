"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { invalidateSessionQuery } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Music,
  History,
  LogOut,
  User,
  Users,
  CreditCard,
  Download,
  Monitor,
  Globe,
  Palette,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"

interface DashboardSidebarProps {
  userName?: string
  userEmail?: string
  slug?: string
  userRole?: string
}

interface SubscriptionData {
  id: string
  dataFim: string
  isActive: boolean
  chave?: string
}

interface ReleaseAssets {
  version: string
  windowsUrl: string | null
  windowsFilename: string | null
  linuxUrl: string | null
  linuxFilename: string | null
}

export function DashboardSidebar({
  userName,
  userEmail,
  slug,
  userRole,
}: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  // React Query deduplica a chamada: só 1 request por sessão independente de quantos componentes montam
  const { data: releasesData, isLoading: isLoadingReleases } = useQuery<ReleaseAssets[]>({
    queryKey: ["latest-release"],
    queryFn: async () => {
      const res = await fetch("/api/latest-release")
      if (!res.ok) return []
      const data = await res.json()
      return data.releases ?? []
    },
    staleTime: 1000 * 60 * 5, // 5 min — segue o revalidate do servidor
    gcTime: 1000 * 60 * 60,   // mantém em cache por 1h
    refetchOnWindowFocus: false,
    retry: false,
  })
  const releases = releasesData ?? []

  useEffect(() => {
    if (userRole === "user" && user?.id) {
      const fetchSubscription = async () => {
        try {
          // Buscar assinatura
          const subscriptionResponse = await fetch(`/api/assinaturas/check?userId=${user.id}`, {
            credentials: "include",
          })
          
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            if (subscriptionData.hasSubscription && subscriptionData.subscription?.isActive) {
              // Buscar chave de ativação
              try {
                const keyResponse = await fetch(`/api/assinaturas/chave?userId=${user.id}`, {
                  credentials: "include",
                })
                let chave: string | undefined
                
                if (keyResponse.ok) {
                  const keyData = await keyResponse.json()
                  chave = keyData.chave
                }
                
                setSubscription({
                  id: subscriptionData.subscription.id,
                  dataFim: subscriptionData.subscription.dataFim,
                  isActive: subscriptionData.subscription.isActive,
                  chave,
                })
              } catch (keyError) {
                // Se não encontrar chave, usar ID formatado como fallback
                setSubscription({
                  id: subscriptionData.subscription.id,
                  dataFim: subscriptionData.subscription.dataFim,
                  isActive: subscriptionData.subscription.isActive,
                })
              }
            }
          }
        } catch (error) {
          console.error("Erro ao buscar assinatura:", error)
        } finally {
          setIsLoadingSubscription(false)
        }
      }
      fetchSubscription()
    } else {
      setIsLoadingSubscription(false)
    }
  }, [userRole, user?.id])


  const calculateDaysRemaining = (dataFim: string): number => {
    const endDate = new Date(dataFim)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const formatSubscriptionKey = (id: string): string => {
    // Formatar o ID da assinatura como chave (primeiros 8 caracteres + últimos 4)
    return `${id.substring(0, 8).toUpperCase()}-${id.substring(id.length - 4).toUpperCase()}`
  }

  const queryClient = useQueryClient()

  const handleLogout = async () => {
    try {
      const { authClient } = await import("@/lib/auth-client")
      await authClient.signOut()
      invalidateSessionQuery(queryClient)
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userName")
      localStorage.removeItem("userSlug")
    }
    router.push("/login")
  }

  const getInitials = () => {
    if (userName) {
      return userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (userEmail) {
      return userEmail[0].toUpperCase()
    }
    return "U"
  }

  type NavItem = { title: string; icon: React.ElementType; url: string }
  const makeItem = (item: NavItem) => ({
    ...item,
    isActive: (() => {
      const dashboardUrl = slug ? `/${slug}` : "/"
      const isDashboard = item.url === dashboardUrl
      return isDashboard ? pathname === item.url : (pathname?.startsWith(item.url) ?? false)
    })(),
  })

  // Itens de navegação principal (visíveis para todos)
  const mainItems = [
    userRole === "admin" && makeItem({
      title: "Dashboard",
      icon: LayoutDashboard,
      url: slug ? `/${slug}` : "/",
    }),
    userRole === "admin" && makeItem({
      title: "Histórico",
      icon: History,
      url: slug ? `/${slug}/historico` : "/historico",
    }),
    makeItem({
      title: "Músicas",
      icon: Music,
      url: slug ? `/${slug}/musicas` : "/musicas",
    }),
    makeItem({
      title: "Perfil",
      icon: User,
      url: slug ? `/${slug}/perfil` : "/perfil",
    }),
  ].filter(Boolean) as ReturnType<typeof makeItem>[]

  // Itens exclusivos de administração (visíveis apenas para admins)
  const adminItems = userRole === "admin"
    ? [
        makeItem({
          title: "Usuários",
          icon: Users,
          url: slug ? `/${slug}/admin/usuarios` : "/admin/usuarios",
        }),
        makeItem({
          title: "Chaves",
          icon: ShieldCheck,
          url: slug ? `/${slug}/admin/chaves` : "/admin/chaves",
        }),
        makeItem({
          title: "Aparência",
          icon: Palette,
          url: slug ? `/${slug}/admin/aparencia` : "/admin/aparencia",
        }),
      ]
    : []

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href={slug ? `/${slug}` : "/"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Music className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BLUE KARAOKÊS</span>
                  <span className="truncate text-xs">Dashboard</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* ── Navegação principal ───────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Administração (somente admins) ────────────────────── */}
        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <ShieldCheck className="h-3 w-3" />
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={item.title}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Card de Assinatura - Apenas para usuários com role "user" */}
        {userRole === "user" && !isLoadingSubscription && subscription && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <Card className="border-sidebar-border bg-sidebar-accent/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Assinatura
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Chave</p>
                    <p className="text-xs font-mono font-semibold text-foreground break-all">
                      {subscription.chave || formatSubscriptionKey(subscription.id)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dias restantes</p>
                    <p className="text-sm font-semibold text-foreground">
                      {calculateDaysRemaining(subscription.dataFim)} dias
                    </p>
                  </div>
                </CardContent>
              </Card>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Card de Downloads */}
        {!isLoadingReleases && releases.length > 0 && (
          <SidebarGroup className="mt-2">
            <SidebarGroupContent>
              <div className="rounded-xl border border-sidebar-border bg-gradient-to-b from-sidebar-accent/60 to-sidebar-accent/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Blue Karaokê Desktop</p>
                  <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    v{releases[0].version}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Baixe o app e comece a cantar agora mesmo!
                </p>
                <div className="flex flex-col gap-2">
                  {releases[0].windowsUrl && (
                    <a
                      href={releases[0].windowsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-2 transition-colors group"
                    >
                      <Monitor className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Windows</p>
                        <p className="text-[10px] text-muted-foreground">Instalador .exe</p>
                      </div>
                      <Download className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
                    </a>
                  )}
                  {releases[0].linuxUrl && (
                    <a
                      href={releases[0].linuxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 border border-sidebar-border px-3 py-2 transition-colors group"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Linux</p>
                        <p className="text-[10px] text-muted-foreground">Pacote .deb</p>
                      </div>
                      <Download className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userName || "Usuário"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail || ""}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="top">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName || "Usuário"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail || ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={slug ? `/${slug}/perfil` : "/perfil"} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

