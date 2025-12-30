"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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
  Home,
  Music,
  History,
  LogOut,
  User,
  CreditCard,
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

  const handleLogout = async () => {
    try {
      const { authClient } = await import("@/lib/auth-client")
      await authClient.signOut()
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

  const menuItems = [
    // Dashboard e Histórico só para admins
    ...(userRole === "admin"
      ? [
          {
            title: "Dashboard",
            icon: Home,
            url: slug ? `/${slug}` : "/",
          },
          {
            title: "Histórico",
            icon: History,
            url: slug ? `/${slug}/historico` : "/historico",
          },
          {
            title: "Admin",
            icon: User,
            url: slug ? `/${slug}/admin/usuarios` : "/admin/usuarios",
            adminOnly: true,
          },
        ]
      : []),
    {
      title: "Músicas",
      icon: Music,
      url: slug ? `/${slug}/musicas` : "/musicas",
    },
    {
      title: "Perfil",
      icon: User,
      url: slug ? `/${slug}/perfil` : "/perfil",
    },
  ].map((item) => {
    const dashboardUrl = slug ? `/${slug}` : "/"
    const isDashboard = item.url === dashboardUrl
    
    // Para dashboard, só está ativo se for exatamente a URL (não pode ter sub-rotas)
    if (isDashboard) {
      return {
        ...item,
        isActive: pathname === item.url,
      }
    }
    
    // Para outras rotas, está ativo se o pathname começar com a URL
    return {
      ...item,
      isActive: pathname?.startsWith(item.url) || false,
    }
  })

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
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

