"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { History, Music, Calendar, Clock, TrendingUp } from "lucide-react"

interface HistoryEntry {
  id: string
  musicTitle: string
  artist: string
  code: string
  playedAt: string
  score?: number
  duration: string
}

export default function HistoricoPage() {
  const router = useRouter()
  const params = useParams()
  const [slug, setSlug] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all")

  // Dados mockados - substituir por dados reais da API
  const historyData: Record<string, HistoryEntry[]> = {
    today: [
      {
        id: "1",
        musicTitle: "Bohemian Rhapsody",
        artist: "Queen",
        code: "01001",
        playedAt: "2024-01-15T14:30:00",
        score: 92,
        duration: "5:55",
      },
      {
        id: "2",
        musicTitle: "Hotel California",
        artist: "Eagles",
        code: "01002",
        playedAt: "2024-01-15T13:15:00",
        score: 88,
        duration: "6:30",
      },
    ],
    week: [
      {
        id: "1",
        musicTitle: "Bohemian Rhapsody",
        artist: "Queen",
        code: "01001",
        playedAt: "2024-01-15T14:30:00",
        score: 92,
        duration: "5:55",
      },
      {
        id: "2",
        musicTitle: "Hotel California",
        artist: "Eagles",
        code: "01002",
        playedAt: "2024-01-15T13:15:00",
        score: 88,
        duration: "6:30",
      },
      {
        id: "3",
        musicTitle: "Stairway to Heaven",
        artist: "Led Zeppelin",
        code: "01003",
        playedAt: "2024-01-14T16:20:00",
        score: 85,
        duration: "8:02",
      },
      {
        id: "4",
        musicTitle: "Sweet Child O' Mine",
        artist: "Guns N' Roses",
        code: "01004",
        playedAt: "2024-01-13T11:45:00",
        score: 90,
        duration: "5:56",
      },
    ],
    month: [
      {
        id: "1",
        musicTitle: "Bohemian Rhapsody",
        artist: "Queen",
        code: "01001",
        playedAt: "2024-01-15T14:30:00",
        score: 92,
        duration: "5:55",
      },
      {
        id: "2",
        musicTitle: "Hotel California",
        artist: "Eagles",
        code: "01002",
        playedAt: "2024-01-15T13:15:00",
        score: 88,
        duration: "6:30",
      },
      {
        id: "3",
        musicTitle: "Stairway to Heaven",
        artist: "Led Zeppelin",
        code: "01003",
        playedAt: "2024-01-14T16:20:00",
        score: 85,
        duration: "8:02",
      },
      {
        id: "4",
        musicTitle: "Sweet Child O' Mine",
        artist: "Guns N' Roses",
        code: "01004",
        playedAt: "2024-01-13T11:45:00",
        score: 90,
        duration: "5:56",
      },
      {
        id: "5",
        musicTitle: "Don't Stop Believin'",
        artist: "Journey",
        code: "01005",
        playedAt: "2024-01-12T09:30:00",
        score: 87,
        duration: "4:18",
      },
      {
        id: "6",
        musicTitle: "Livin' on a Prayer",
        artist: "Bon Jovi",
        code: "01021",
        playedAt: "2024-01-11T15:20:00",
        score: 89,
        duration: "4:09",
      },
    ],
    all: [
      {
        id: "1",
        musicTitle: "Bohemian Rhapsody",
        artist: "Queen",
        code: "01001",
        playedAt: "2024-01-15T14:30:00",
        score: 92,
        duration: "5:55",
      },
      {
        id: "2",
        musicTitle: "Hotel California",
        artist: "Eagles",
        code: "01002",
        playedAt: "2024-01-15T13:15:00",
        score: 88,
        duration: "6:30",
      },
      {
        id: "3",
        musicTitle: "Stairway to Heaven",
        artist: "Led Zeppelin",
        code: "01003",
        playedAt: "2024-01-14T16:20:00",
        score: 85,
        duration: "8:02",
      },
      {
        id: "4",
        musicTitle: "Sweet Child O' Mine",
        artist: "Guns N' Roses",
        code: "01004",
        playedAt: "2024-01-13T11:45:00",
        score: 90,
        duration: "5:56",
      },
      {
        id: "5",
        musicTitle: "Don't Stop Believin'",
        artist: "Journey",
        code: "01005",
        playedAt: "2024-01-12T09:30:00",
        score: 87,
        duration: "4:18",
      },
      {
        id: "6",
        musicTitle: "Livin' on a Prayer",
        artist: "Bon Jovi",
        code: "01021",
        playedAt: "2024-01-11T15:20:00",
        score: 89,
        duration: "4:09",
      },
      {
        id: "7",
        musicTitle: "Wonderwall",
        artist: "Oasis",
        code: "01022",
        playedAt: "2024-01-10T10:15:00",
        score: 86,
        duration: "4:18",
      },
      {
        id: "8",
        musicTitle: "Sweet Caroline",
        artist: "Neil Diamond",
        code: "01020",
        playedAt: "2024-01-09T14:00:00",
        score: 91,
        duration: "3:23",
      },
    ],
  }

  const history = historyData[timeFilter] || []

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("userEmail")
      const name = localStorage.getItem("userName")
      const storedSlug = localStorage.getItem("userSlug")
      
      if (slug && storedSlug !== slug) {
        router.push("/login")
        return
      }
      
      if (email) {
        setUserEmail(email)
        if (name) {
          setUserName(name)
        }
      } else {
        router.push("/login")
      }
    }
  }, [slug, router])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("pt-BR"),
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return "default"
    if (score >= 90) return "default"
    if (score >= 80) return "secondary"
    if (score >= 70) return "outline"
    return "destructive"
  }

  if (!slug || !userEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        userName={userName}
        userEmail={userEmail}
        slug={slug}
        userRole={undefined}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Histórico</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{history.length}</div>
                <p className="text-xs text-muted-foreground">Músicas tocadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média de Pontuação</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {history.length > 0
                    ? Math.round(
                        history.reduce((acc, h) => acc + (h.score || 0), 0) / history.length
                      )
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Pontos médios</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {history.length > 0
                    ? history.reduce((acc, h) => {
                        const [min, sec] = h.duration.split(":").map(Number)
                        return acc + min * 60 + sec
                      }, 0)
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Minutos totais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Sessão</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {history.length > 0
                    ? formatDateTime(history[0].playedAt).date
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {history.length > 0
                    ? formatDateTime(history[0].playedAt).time
                    : "Nenhuma sessão"}
                </p>
              </CardContent>
            </Card>
          </div>

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Música</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
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
                      const { date, time } = formatDateTime(entry.playedAt)
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.musicTitle}</div>
                          </TableCell>
                          <TableCell>{entry.artist}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {entry.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{date}</div>
                            <div className="text-xs text-muted-foreground">{time}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {entry.duration}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.score !== undefined ? (
                              <Badge variant={getScoreColor(entry.score)}>
                                {entry.score} pts
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

