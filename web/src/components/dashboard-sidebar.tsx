"use client"

import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface DashboardSidebarProps {
  userName?: string
  userEmail?: string
  slug?: string
  userRole?: string
}

export function DashboardSidebar({
  userName,
  userEmail,
  slug,
  userRole,
}: DashboardSidebarProps) {
  const router = useRouter()

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
    {
      title: "Dashboard",
      icon: Home,
      url: slug ? `/${slug}` : "/",
      isActive: true,
    },
    {
      title: "Músicas",
      icon: Music,
      url: slug ? `/${slug}/musicas` : "/musicas",
    },
    {
      title: "Histórico",
      icon: History,
      url: slug ? `/${slug}/historico` : "/historico",
    },
    ...(userRole === "admin"
      ? [
          {
            title: "Admin",
            icon: User,
            url: slug ? `/${slug}/admin/usuarios` : "/admin/usuarios",
            adminOnly: true,
          },
        ]
      : []),
    {
      title: "Perfil",
      icon: User,
      url: slug ? `/${slug}/perfil` : "/perfil",
    },
  ]

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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2 px-2 py-1.5">
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
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-destructive hover:text-destructive"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

