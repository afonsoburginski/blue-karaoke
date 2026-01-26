"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { navigateFast } from "@/lib/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useQueryClient } from "@tanstack/react-query"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Music, HardDrive, DollarSign, TrendingUp, ArrowRight } from "lucide-react"
import { useStorageUsage } from "@/hooks/use-storage-usage"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useTopMusics } from "@/hooks/use-top-musics"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard"
import { authClient } from "@/lib/auth-client"

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("week")
  const [newUsers, setNewUsers] = useState<any[]>([])

  // Stats do dashboard (cacheadas)
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useDashboardStats()

  // Músicas mais tocadas por período (cacheadas)
  const {
    data: topMusics,
    isLoading: topMusicsLoading,
    refetch: refetchTopMusics,
  } = useTopMusics(timeFilter)

  // Uso de storage (R2) com cache via React Query
  const {
    data: storageUsage,
    isLoading: storageLoading,
    refetch: refetchStorage,
  } = useStorageUsage()

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    // Não fazer nada enquanto está carregando
    if (authLoading) {
      return
    }

    // Aguardar um pouco para garantir que a sessão foi carregada completamente
    // Isso evita redirecionamentos durante Fast Refresh ou atualizações de sessão
    const timeoutId = setTimeout(() => {
      const currentUser = user // Capturar valor atual
      
      if (!currentUser) {
        navigateFast(router, "/login")
        return
      }

      // Verificar se é admin - apenas admins podem acessar dashboard
      const userRole = currentUser.role || "user"
      
      if (userRole !== "admin") {
        // Usuários com role "user" não podem acessar dashboard
        // Redirecionar para o perfil
        const currentSlug = currentUser?.slug
        if (currentSlug) {
          navigateFast(router, `/${currentSlug}/perfil`)
        } else {
          navigateFast(router, "/login")
        }
        return
      }

      // Verificar slug antes de continuar
      const currentSlug = currentUser?.slug
      if (slug && currentSlug && currentSlug !== slug) {
        navigateFast(router, `/${currentSlug}`)
        return
      }

      // Remover parâmetro de pagamento se existir
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search)
        const paymentSuccess = searchParams.get("payment_success")
        
        if (paymentSuccess === "true") {
          // Remover o parâmetro da URL
          const newUrl = window.location.pathname
          window.history.replaceState({}, "", newUrl)
        }
      }

      // Buscar novos usuários (apenas para admin)
      // Aguardar um pouco mais para garantir que a sessão está completamente carregada
      if (userRole === "admin" && currentUser) {
        // Usar um timeout separado para não bloquear o resto do código
        const fetchTimeoutId = setTimeout(() => {
          fetch("/api/estatisticas/novos-usuarios?limit=5", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((res) => {
              if (!res.ok) {
                // Se for 401 ou 403, não tentar novamente
                if (res.status === 401 || res.status === 403) {
                  return null
                }
                throw new Error(`HTTP error! status: ${res.status}`)
              }
              return res.json()
            })
            .then((data) => {
              if (data && data.usuarios) {
                setNewUsers(data.usuarios)
              }
            })
            .catch((error) => {
              // Silenciar erros de rede durante o carregamento inicial
              // Apenas logar se não for um erro de rede comum
              if (error.name !== "TypeError" || !error.message?.includes("Failed to fetch")) {
                console.error("Erro ao buscar novos usuários:", error)
              }
            })
        }, 500) // Aguardar 500ms após o timeout inicial
        
        // Limpar timeout se o componente for desmontado
        return () => {
          clearTimeout(fetchTimeoutId)
        }
      }
    }, 100) // Pequeno delay para garantir que a sessão está estável

    return () => clearTimeout(timeoutId)
  }, [user, slug, authLoading, router])

  // Callbacks memoizados para Realtime - atualizar cache granularmente
  const handleHistoricoChange = useCallback(() => {
    // Invalidar apenas queries relacionadas ao histórico
    queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard", "topMusics"] })
  }, [queryClient])

  const handleMusicasChange = useCallback(() => {
    // Invalidar apenas queries relacionadas a músicas
    queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] })
    queryClient.invalidateQueries({ queryKey: ["musicas"] })
  }, [queryClient])

  const handleUsersChange = useCallback(() => {
    if (user && user.role === "admin") {
      // Buscar novos usuários apenas se necessário (não bloquear UI)
      fetch("/api/estatisticas/novos-usuarios?limit=5", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          if (data.usuarios) {
            setNewUsers(data.usuarios)
          }
        })
        .catch((error) => {
          // Não mostrar erro ao usuário, apenas logar
        })
    }
    // Invalidar apenas queries relacionadas a usuários
    queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] })
    queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] })
  }, [user, queryClient])

  const handleEstatisticasChange = useCallback(() => {
    // Invalidar apenas estatísticas
    queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] })
  }, [queryClient])

  // Realtime para dashboard
  useRealtimeDashboard({
    userId: user?.id || "",
    onHistoricoChange: handleHistoricoChange,
    onMusicasChange: handleMusicasChange,
    onUsersChange: handleUsersChange,
    onEstatisticasChange: handleEstatisticasChange,
  })

  // Só mostrar loading se realmente não temos dados essenciais
  // Não bloquear a UI se apenas algumas queries estão carregando
  // Não mostrar loading durante navegação - React Query tem cache
  // Só renderizar se temos user e slug, caso contrário deixar useEffect redirecionar silenciosamente
  if (!user || !slug) {
    return null // Redirecionamento silencioso sem loading
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        userName={user.name}
        userEmail={user.email}
        slug={slug}
        userRole={user.role}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalUsuarios?.toLocaleString() ?? "0"}
                </div>
                <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Músicas</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalMusicas?.toLocaleString() ?? "0"}
                </div>
                <p className="text-xs text-muted-foreground">Músicas no catálogo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-sm font-medium">Total de GB</CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    Banco + R2 (aprox.)
                  </span>
                </div>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalGb ? `${stats.totalGb.toFixed(1)} GB` : "0 GB"}
                </div>
                {storageUsage && (
                  <p className="text-xs text-muted-foreground mt-1">
                    R2: {storageUsage.totalGb.toFixed(2)} GB em{" "}
                    {storageUsage.totalObjects.toLocaleString()} arquivos
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 text-[11px] text-primary underline-offset-2 hover:underline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["storage", "usage"] })}
                >
                  Recarregar uso do storage
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {stats?.receitaMensal ? (stats.receitaMensal / 100).toLocaleString() : "0"}
                </div>
                <button
                  type="button"
                  className="mt-2 text-[11px] text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] })
                    queryClient.invalidateQueries({ queryKey: ["dashboard", "topMusics"] })
                  }}
                >
                  Atualizar estatísticas
                </button>
                <p className="text-xs text-muted-foreground">Receita do mês atual</p>
              </CardContent>
            </Card>
          </div>

          {/* Área Principal - Tabelas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Músicas Mais Tocadas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle>Músicas Mais Tocadas</CardTitle>
                    <CardDescription>Ranking das músicas mais populares</CardDescription>
                  </div>
                  <Select
                    value={timeFilter}
                    onValueChange={(v) => setTimeFilter(v as "week" | "month" | "year")}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                      <SelectItem value="year">Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Música</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead className="text-right">Reproduções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMusics && topMusics.length > 0 ? (
                      topMusics.map((music) => (
                        <TableRow key={music.codigo}>
                          <TableCell className="font-medium">{music.rank}</TableCell>
                          <TableCell>
                            <div className="font-medium">{music.titulo}</div>
                            <div className="text-xs text-muted-foreground">Código: {music.codigo}</div>
                          </TableCell>
                          <TableCell>{music.artista}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <TrendingUp className="h-3 w-3 text-muted-foreground" />
                              {music.reproducoes.toLocaleString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma música encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Novos Usuários */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Novos Usuários</CardTitle>
                  <CardDescription>Usuários cadastrados recentemente</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateFast(router, `/${slug}/admin/usuarios`)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  Ver todos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newUsers.length > 0 ? (
                      newUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm">
                              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          {user.role === "admin" ? "Nenhum usuário recente" : "Acesso restrito"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

