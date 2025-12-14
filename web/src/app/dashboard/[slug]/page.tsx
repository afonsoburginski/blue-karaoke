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
import { Users, Music, HardDrive, DollarSign, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const [slug, setSlug] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("week")

  // Dados mockados - substituir por dados reais da API
  const stats = {
    totalUsers: 1250,
    totalMusics: 3420,
    totalGB: 125.5,
    monthlyRevenue: 12500,
  }

  const topMusics = {
    week: [
      { id: 1, title: "Shape of You", artist: "Ed Sheeran", plays: 342, code: "01015" },
      { id: 2, title: "Blinding Lights", artist: "The Weeknd", plays: 298, code: "01016" },
      { id: 3, title: "Watermelon Sugar", artist: "Harry Styles", plays: 267, code: "01017" },
      { id: 4, title: "Levitating", artist: "Dua Lipa", plays: 245, code: "01018" },
      { id: 5, title: "Good 4 U", artist: "Olivia Rodrigo", plays: 223, code: "01019" },
    ],
    month: [
      { id: 1, title: "Bohemian Rhapsody", artist: "Queen", plays: 1845, code: "01001" },
      { id: 2, title: "Hotel California", artist: "Eagles", plays: 1623, code: "01002" },
      { id: 3, title: "Sweet Caroline", artist: "Neil Diamond", plays: 1456, code: "01020" },
      { id: 4, title: "Don't Stop Believin'", artist: "Journey", plays: 1324, code: "01005" },
      { id: 5, title: "Livin' on a Prayer", artist: "Bon Jovi", plays: 1187, code: "01021" },
    ],
    year: [
      { id: 1, title: "Bohemian Rhapsody", artist: "Queen", plays: 18450, code: "01001" },
      { id: 2, title: "Hotel California", artist: "Eagles", plays: 16230, code: "01002" },
      { id: 3, title: "Stairway to Heaven", artist: "Led Zeppelin", plays: 14870, code: "01003" },
      { id: 4, title: "Sweet Child O' Mine", artist: "Guns N' Roses", plays: 13240, code: "01004" },
      { id: 5, title: "Wonderwall", artist: "Oasis", plays: 12150, code: "01022" },
    ],
  }

  const newUsers = [
    { id: 1, name: "João Silva", email: "joao@email.com", joinedAt: "2024-01-15", status: "Ativo" },
    { id: 2, name: "Maria Santos", email: "maria@email.com", joinedAt: "2024-01-14", status: "Ativo" },
    { id: 3, name: "Pedro Costa", email: "pedro@email.com", joinedAt: "2024-01-13", status: "Ativo" },
    { id: 4, name: "Ana Oliveira", email: "ana@email.com", joinedAt: "2024-01-12", status: "Ativo" },
    { id: 5, name: "Carlos Souza", email: "carlos@email.com", joinedAt: "2024-01-11", status: "Ativo" },
  ]

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
      
      // Verificar se o slug da URL corresponde ao slug armazenado
      if (slug && storedSlug !== slug) {
        // Se não corresponder, redirecionar para login
        router.push("/login")
        return
      }
      
      if (email) {
        setUserEmail(email)
        if (name) {
          setUserName(name)
        }
      } else {
        // Se não houver email, redirecionar para login
        router.push("/login")
      }
    }
  }, [slug, router])

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
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
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
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Músicas</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMusics.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Músicas no catálogo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de GB</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalGB.toFixed(1)} GB</div>
                <p className="text-xs text-muted-foreground">Armazenamento usado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {stats.monthlyRevenue.toLocaleString()}</div>
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
                    {topMusics[timeFilter].map((music, index) => (
                      <TableRow key={music.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{music.title}</div>
                          <div className="text-xs text-muted-foreground">Código: {music.code}</div>
                        </TableCell>
                        <TableCell>{music.artist}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            {music.plays.toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Novos Usuários */}
            <Card>
              <CardHeader>
                <CardTitle>Novos Usuários</CardTitle>
                <CardDescription>Usuários cadastrados recentemente</CardDescription>
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
                    {newUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">{new Date(user.joinedAt).toLocaleDateString("pt-BR")}</div>
                          <div className="text-xs text-muted-foreground">{user.status}</div>
                        </TableCell>
                      </TableRow>
                    ))}
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

