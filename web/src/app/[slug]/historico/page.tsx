"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { History, Music, Calendar, Clock, Play } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRealtimeHistorico } from "@/hooks/use-realtime-historico"

interface HistoryEntry {
  id: string
  musicaId: string
  codigo: string
  dataExecucao: string
  musica: {
    id: string
    titulo: string
    artista: string
    duracao: number | null
  } | null
}

interface MostPlayed {
  musicaId: string
  codigo: string
  vezesTocada: number
  titulo: string
  artista: string
  duracao: number | null
}

export default function HistoricoPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [mostPlayed, setMostPlayed] = useState<MostPlayed[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

    if (!user) {
      router.push("/login")
      return
    }

    // Verificar se é admin - apenas admins podem acessar histórico
    if (user.role !== "admin") {
      // Usuários com role "user" não podem acessar histórico
      // Redirecionar para o perfil
      if (user.slug) {
        router.push(`/${user.slug}/perfil`)
      } else {
        router.push("/login")
      }
      return
    }

    if (slug && user.slug !== slug) {
      router.push(`/${user.slug}/historico`)
      return
    }
  }, [user, slug, authLoading, router])

  const fetchHistory = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/historico?filter=${timeFilter}&limit=100`)
      if (!response.ok) {
        throw new Error("Erro ao buscar histórico")
      }
      const data = await response.json()
      setHistory(data.historico || [])
      setMostPlayed(data.maisTocadas || [])
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user, timeFilter])

  useEffect(() => {
    if (user && slug) {
      fetchHistory()
    }
  }, [user, slug, fetchHistory])

  // Callbacks memoizados para Realtime
  const handleInsert = useCallback(() => {
    if (user && slug) {
      fetchHistory()
    }
  }, [user, slug, fetchHistory])

  const handleUpdate = useCallback(() => {
    if (user && slug) {
      fetchHistory()
    }
  }, [user, slug, fetchHistory])

  const handleDelete = useCallback(() => {
    if (user && slug) {
      fetchHistory()
    }
  }, [user, slug, fetchHistory])

  // Realtime para histórico
  useRealtimeHistorico({
    userId: user?.id || "",
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("pt-BR"),
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "-"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getTotalMinutes = (): number => {
    return history.reduce((acc, entry) => {
      const duration = entry.musica?.duracao || 0
      return acc + duration
    }, 0)
  }

  if (authLoading || !user || !slug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Carregando...</div>
      </div>
    )
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
            <h1 className="text-lg font-semibold">Histórico</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Reproduções</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{history.length}</div>
                <p className="text-xs text-muted-foreground">Músicas tocadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(getTotalMinutes() / 60)}h {getTotalMinutes() % 60}m
                </div>
                <p className="text-xs text-muted-foreground">Tempo de reprodução</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Reprodução</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {history.length > 0
                    ? formatDateTime(history[0].dataExecucao).date
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {history.length > 0
                    ? formatDateTime(history[0].dataExecucao).time
                    : "Nenhuma reprodução"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mais Tocadas */}
          {mostPlayed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mais Tocadas</CardTitle>
                <CardDescription>
                  Suas músicas mais reproduzidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Música</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Vezes Tocada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostPlayed.map((item, index) => (
                      <TableRow key={item.musicaId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.titulo}</div>
                        </TableCell>
                        <TableCell>{item.artista}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {item.codigo}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDuration(item.duracao)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Play className="h-3 w-3 text-muted-foreground" />
                            {item.vezesTocada}x
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tabela de Histórico */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle>Histórico de Reproduções</CardTitle>
                  <CardDescription>
                    Registro de todas as músicas tocadas
                  </CardDescription>
                </div>
                <Select
                  value={timeFilter}
                  onValueChange={(v) => setTimeFilter(v as "today" | "week" | "month" | "all")}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="all">Tudo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Carregando...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Música</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <History className="h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma música tocada ainda
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Seu histórico de reproduções aparecerá aqui
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((entry, index) => {
                        const { date, time } = formatDateTime(entry.dataExecucao)
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {entry.musica?.titulo || "Música não encontrada"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.musica?.artista || "Artista desconhecido"}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {entry.codigo}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{date}</div>
                              <div className="text-xs text-muted-foreground">{time}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDuration(entry.musica?.duracao || null)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
