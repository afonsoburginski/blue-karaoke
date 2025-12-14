"use client"

import { useEffect, useState } from "react"
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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Key, Copy, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Chave {
  id: string
  chave: string
  tipo: string
  status: string
  limiteTempo?: number | null
  dataInicio?: string | null
  dataExpiracao?: string | null
  usadoEm?: string | null
  ultimoUso?: string | null
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  } | null
}

export default function AdminChavesPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [chaves, setChaves] = useState<Chave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [novaChave, setNovaChave] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    tipo: "maquina",
    userId: "",
    limiteTempo: "",
    dataExpiracao: "",
  })

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user && user.role !== "admin") {
      router.push(`/${user.slug}`)
      return
    }

    if (user && slug) {
      fetchChaves()
    }
  }, [user, slug, authLoading, router, tipoFilter, statusFilter])

  const fetchChaves = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (tipoFilter !== "all") params.append("tipo", tipoFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/admin/chaves?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setChaves(data.chaves || [])
      }
    } catch (error) {
      console.error("Erro ao buscar chaves:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body: any = {
        tipo: formData.tipo,
      }

      if (formData.tipo === "maquina") {
        if (!formData.limiteTempo) {
          alert("Limite de tempo é obrigatório para máquinas")
          return
        }
        body.limiteTempo = parseInt(formData.limiteTempo)
      } else {
        if (!formData.dataExpiracao) {
          alert("Data de expiração é obrigatória para assinaturas")
          return
        }
        body.dataExpiracao = formData.dataExpiracao
        if (formData.userId) {
          body.userId = formData.userId
        }
      }

      const response = await fetch("/api/admin/chaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Erro ao criar chave")
        return
      }

      setNovaChave(data.chave.chave)
      setFormData({
        tipo: "maquina",
        userId: "",
        limiteTempo: "",
        dataExpiracao: "",
      })
      fetchChaves()
    } catch (error) {
      console.error("Erro ao criar chave:", error)
      alert("Erro ao criar chave")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || isLoading || !user || !slug || user.role !== "admin") {
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Gerenciar Chaves de Ativação</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {novaChave && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">
                      Chave criada com sucesso!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-mono">
                      {novaChave}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(novaChave)}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Chaves de Ativação</CardTitle>
                <CardDescription>
                  Crie e gerencie chaves para assinantes e máquinas físicas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="assinatura">Assinaturas</SelectItem>
                    <SelectItem value="maquina">Máquinas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativa">Ativas</SelectItem>
                    <SelectItem value="expirada">Expiradas</SelectItem>
                    <SelectItem value="revogada">Revogadas</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Chave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Chave de Ativação</DialogTitle>
                      <DialogDescription>
                        Crie uma chave para assinante ou máquina física
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateChave} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo de Chave</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tipo: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assinatura">Assinatura</SelectItem>
                            <SelectItem value="maquina">Máquina Física</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.tipo === "maquina" && (
                        <div className="space-y-2">
                          <Label htmlFor="limiteTempo">
                            Limite de Tempo (horas)
                          </Label>
                          <Input
                            id="limiteTempo"
                            type="number"
                            placeholder="Ex: 72 (3 dias) ou 8 (8 horas)"
                            value={formData.limiteTempo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                limiteTempo: e.target.value,
                              })
                            }
                            required
                            min={1}
                          />
                          <p className="text-xs text-muted-foreground">
                            Tempo em horas que a máquina pode funcionar
                          </p>
                        </div>
                      )}

                      {formData.tipo === "assinatura" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="dataExpiracao">
                              Data de Expiração
                            </Label>
                            <Input
                              id="dataExpiracao"
                              type="date"
                              value={formData.dataExpiracao}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  dataExpiracao: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="userId">
                              ID do Usuário (opcional)
                            </Label>
                            <Input
                              id="userId"
                              placeholder="UUID do usuário assinante"
                              value={formData.userId}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  userId: e.target.value,
                                })
                              }
                            />
                          </div>
                        </>
                      )}

                      <Button type="submit" className="w-full">
                        Criar Chave
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Limite/Expiração</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Último Uso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chaves.length > 0 ? (
                    chaves.map((chave) => (
                      <TableRow key={chave.id}>
                        <TableCell className="font-mono text-sm">
                          {chave.chave}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              chave.tipo === "maquina" ? "secondary" : "default"
                            }
                          >
                            {chave.tipo === "maquina" ? "Máquina" : "Assinatura"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              chave.status === "ativa"
                                ? "default"
                                : chave.status === "expirada"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {chave.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {chave.tipo === "maquina" ? (
                            chave.limiteTempo ? (
                              `${chave.limiteTempo}h`
                            ) : (
                              "-"
                            )
                          ) : (
                            chave.dataExpiracao
                              ? new Date(chave.dataExpiracao).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {chave.user ? (
                            <div>
                              <div className="font-medium">{chave.user.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {chave.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {chave.ultimoUso
                            ? new Date(chave.ultimoUso).toLocaleDateString(
                                "pt-BR"
                              )
                            : chave.usadoEm
                            ? new Date(chave.usadoEm).toLocaleDateString("pt-BR")
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(chave.chave)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhuma chave encontrada
                      </TableCell>
                    </TableRow>
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

