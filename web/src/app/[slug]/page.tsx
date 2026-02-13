"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { navigateFast } from "@/lib/navigation"
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
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard"

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("week")

  // Uma única requisição: user + stats + topMusics + storage + novosUsuarios (sem get-session antes)
  const { data: dashboardData, isLoading: dashboardLoading, isError, error } = useDashboardData({
    enabled: true,
  })

  const user = dashboardData?.user
  const stats = dashboardData?.stats
  const topMusics = dashboardData?.topMusics ?? []
  const storageUsage = dashboardData?.storageUsage
  const newUsers = dashboardData?.novosUsuarios ?? []

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  // Redirecionar conforme resposta do dashboard (401/403) ou slug incorreto
  useEffect(() => {
    if (dashboardLoading) return
    if (isError && error) {
      const msg = error.message || ""
      if (msg.includes("Não autenticado")) {
        navigateFast(router, "/login")
        return
      }
      if (msg.includes("Acesso negado")) {
        navigateFast(router, slug ? `/${slug}/perfil` : "/login")
        return
      }
      return
    }
    if (!user || !slug) return
    if (user.slug && user.slug !== slug) {
      navigateFast(router, `/${user.slug}`)
      return
    }
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get("payment_success") === "true") {
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [dashboardLoading, isError, error, user, slug, router])

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", "data"] })
  }, [queryClient])

  const handleHistoricoChange = useCallback(() => {
    invalidateDashboard()
  }, [invalidateDashboard])

  const handleMusicasChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["musicas"] })
    invalidateDashboard()
  }, [queryClient, invalidateDashboard])

  const handleUsersChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] })
    invalidateDashboard()
  }, [queryClient, invalidateDashboard])

  const handleEstatisticasChange = useCallback(() => {
    invalidateDashboard()
  }, [invalidateDashboard])

  // Realtime para dashboard
  useRealtimeDashboard({
    userId: user?.id || "",
    onHistoricoChange: handleHistoricoChange,
    onMusicasChange: handleMusicasChange,
    onUsersChange: handleUsersChange,
    onEstatisticasChange: handleEstatisticasChange,
  })

  if (dashboardLoading || isError || !user) {
    return null
  }

  const currentSlug = slug ?? user.slug

  return (
    <SidebarProvider>
      <DashboardSidebar
        userName={user.name}
        userEmail={user.email}
        slug={currentSlug}
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
                    Banco + Storage (aprox.)
                  </span>
                </div>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(Number(stats?.totalGb ?? 0) + Number(storageUsage?.totalGb ?? 0)).toFixed(2)} GB
                </div>
                {storageUsage && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Storage: {Number(storageUsage.totalGb).toFixed(2)} GB em{" "}
                    {storageUsage.totalObjects.toLocaleString()} arquivos
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 text-[11px] text-primary underline-offset-2 hover:underline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["dashboard", "data"] })}
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
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["dashboard", "data"] })}
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
                  onClick={() => navigateFast(router, `/${currentSlug}/admin/usuarios`)}
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

