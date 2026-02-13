"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { navigateFast } from "@/lib/navigation"
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
import { Plus, Copy, CheckCircle2, Trash2, Pencil } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
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
  const { user, isLoading: authLoading, isRoleLoading } = useAuth()
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
  const [editDiasOpen, setEditDiasOpen] = useState(false)
  const [editChave, setEditChave] = useState<Chave | null>(null)
  const [editDiasValue, setEditDiasValue] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isPatching, setIsPatching] = useState(false)

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (authLoading || isRoleLoading) return

    if (!user) {
      navigateFast(router, "/login")
      return
    }

    if (user.role !== "admin") {
      navigateFast(router, `/${user.slug}`)
      return
    }

    if (user && slug) {
      fetchChaves()
    }
  }, [user, slug, authLoading, isRoleLoading, router, tipoFilter, statusFilter])

  const fetchChaves = async (bustCache = false) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (tipoFilter !== "all") params.append("tipo", tipoFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (bustCache) params.append("_t", String(Date.now()))

      const response = await fetch(`/api/admin/chaves?${params.toString()}`, {
        cache: "no-store",
      })
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
          alert("Limite em dias é obrigatório para máquinas")
          return
        }
        body.limiteTempo = parseInt(formData.limiteTempo, 10)
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
      setDialogOpen(false)
      await fetchChaves(true)
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

  function diasRestantesChave(chave: Chave): number | null {
    const now = Date.now()
    if (chave.dataExpiracao) {
      const diff = new Date(chave.dataExpiracao).getTime() - now
      return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
    }
    if (chave.tipo === "maquina" && chave.dataInicio && chave.limiteTempo != null) {
      const inicio = new Date(chave.dataInicio).getTime()
      const fim = inicio + chave.limiteTempo * 24 * 60 * 60 * 1000
      return Math.max(0, Math.ceil((fim - now) / (24 * 60 * 60 * 1000)))
    }
    if (chave.tipo === "maquina" && chave.limiteTempo != null) return chave.limiteTempo
    return null
  }

  const handleDeleteChave = async (id: string) => {
    if (!confirm("Deletar esta chave? Quem a estiver usando perderá o acesso.")) return
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/chaves?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Erro ao deletar")
        return
      }
      setChaves((prev) => prev.filter((c) => c.id !== id))
      await fetchChaves(true)
    } catch (e) {
      console.error(e)
      alert("Erro ao deletar chave")
    } finally {
      setIsDeleting(null)
    }
  }

  const openEditDias = (chave: Chave) => {
    const dias = diasRestantesChave(chave)
    setEditChave(chave)
    setEditDiasValue(dias != null ? String(dias) : "")
    setEditDiasOpen(true)
  }

  const handleSaveDias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editChave) return
    const dias = parseInt(editDiasValue, 10)
    if (isNaN(dias) || dias < 0) {
      alert("Informe um número de dias válido (≥ 0)")
      return
    }
    setIsPatching(true)
    try {
      const res = await fetch("/api/admin/chaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editChave.id, diasRestantes: dias }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Erro ao salvar")
        return
      }
      setEditDiasOpen(false)
      setEditChave(null)
      // Atualização imediata na tabela: dados da chave editada + status ativa se dias > 0
      if (data.chave?.id) {
        const dias = parseInt(editDiasValue, 10)
        setChaves((prev) =>
          prev.map((c) =>
            c.id === data.chave.id
              ? {
                  ...c,
                  dataExpiracao: data.chave.dataExpiracao,
                  status: dias > 0 ? "ativa" : "expirada",
                }
              : c
          )
        )
      }
      await fetchChaves(true)
    } catch (e) {
      console.error(e)
      alert("Erro ao salvar")
    } finally {
      setIsPatching(false)
    }
  }

  // Não mostrar loading durante navegação - React Query tem cache
  // Só renderizar se temos user e slug, caso contrário deixar useEffect redirecionar silenciosamente
  if (!user || !slug) {
    return null // Redirecionamento silencioso sem loading
  }

  // Se não for admin, não renderizar nada enquanto redireciona (o useEffect já cuida do redirect)
  if (user.role !== "admin") {
    return null // Redirecionamento silencioso
  }

  // TypeScript: user e slug garantidamente não são null aqui
  const safeUser = user
  const safeSlug = slug

  return (
    <SidebarProvider>
      <DashboardSidebar
        userName={safeUser.name}
        userEmail={safeUser.email}
        slug={safeSlug}
        userRole={safeUser.role}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">Gerenciar Chaves de Ativação</h1>
          </div>
          <ThemeToggle />
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
                            Limite (dias)
                          </Label>
                          <Input
                            id="limiteTempo"
                            type="number"
                            placeholder="Ex: 30"
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
                            Quantos dias a máquina pode usar a chave
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
              <Dialog open={editDiasOpen} onOpenChange={setEditDiasOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar dias restantes</DialogTitle>
                    <DialogDescription>
                      Defina quantos dias restam para esta chave. A data de expiração será atualizada.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveDias} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editDias">Dias restantes</Label>
                      <Input
                        id="editDias"
                        type="number"
                        min={0}
                        value={editDiasValue}
                        onChange={(e) => setEditDiasValue(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditDiasOpen(false)
                          setEditChave(null)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isPatching}>
                        {isPatching ? "Salvando…" : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
                            diasRestantesChave(chave) != null ? (
                              `${diasRestantesChave(chave)} dias`
                            ) : chave.limiteTempo != null ? (
                              `${chave.limiteTempo} dias (não usada)`
                            ) : (
                              "-"
                            )
                          ) : chave.dataExpiracao ? (
                            (() => {
                              const dias = diasRestantesChave(chave)
                              return (
                                <>
                                  {new Date(chave.dataExpiracao).toLocaleDateString("pt-BR")}
                                  {dias != null && (
                                    <span className="text-muted-foreground ml-1">
                                      ({dias} dias)
                                    </span>
                                  )}
                                </>
                              )
                            })()
                          ) : (
                            "-"
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
                        <TableCell className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(chave.chave)}
                            title="Copiar chave"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDias(chave)}
                            title="Editar dias restantes"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChave(chave.id)}
                            disabled={isDeleting === chave.id}
                            title="Deletar chave"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

