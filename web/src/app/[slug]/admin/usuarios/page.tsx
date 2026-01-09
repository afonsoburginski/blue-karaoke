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
import { Plus, Key, Clock, CalendarCheck, Copy, Check, Eye, EyeOff, KeyRound } from "lucide-react"
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "sonner"

interface Usuario {
  id: string
  slug: string
  name: string
  email: string
  avatar?: string | null
  role: string
  userType: string
  isActive: boolean
  createdAt: string
  diasRestantes: number | null
  dataAtivacao: string | null
  assinatura?: {
    id: string
    plano: string
    status: string
    dataInicio: string
    dataFim: string
    valor: number
    renovacaoAutomatica: boolean
  } | null
  chaveAtivacao?: {
    id: string
    chave: string
    tipo: string
    status: string
    dataExpiracao: string | null
    usadoEm: string | null
    ultimoUso: string | null
  } | null
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    userType: "subscriber",
    role: "user",
  })
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [keyFormData, setKeyFormData] = useState({
    tipo: "assinatura" as "assinatura" | "maquina",
    dataExpiracao: "",
    limiteTempo: "",
  })

  const toggleKeyVisibility = (userId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(userId)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const formatDaysRemaining = (days: number | null): string => {
    if (days === null) return "-"
    if (days === 0) return "Expirado"
    if (days === 1) return "1 dia"
    return `${days} dias`
  }

  const getDaysColor = (days: number | null): string => {
    if (days === null) return "text-muted-foreground"
    if (days <= 0) return "text-destructive"
    if (days <= 7) return "text-orange-500"
    if (days <= 30) return "text-yellow-500"
    return "text-green-500"
  }

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    // Não fazer nada enquanto está carregando
    if (authLoading) return

    // Aguardar um pouco para garantir que a sessão foi carregada
    const timeoutId = setTimeout(() => {
      if (!user) {
        router.push("/login")
        return
      }

      if (user.role !== "admin") {
        router.push(`/${user.slug}`)
        return
      }

      if (slug) {
        fetchUsuarios()
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [user, slug, authLoading, router, tipoFilter, statusFilter])

  const fetchUsuarios = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (tipoFilter !== "all") params.append("tipo", tipoFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/admin/usuarios?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsuarios(data.usuarios || [])
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar usuário")
        return
      }

      setDialogOpen(false)
      setFormData({
        name: "",
        email: "",
        password: "",
        userType: "subscriber",
        role: "user",
      })
      fetchUsuarios()
      toast.success("Usuário criado com sucesso!")
    } catch (error) {
      console.error("Erro ao criar usuário:", error)
      toast.error("Erro ao criar usuário")
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    try {
      const payload: any = {
        tipo: keyFormData.tipo,
        userId: selectedUserId,
      }

      if (keyFormData.tipo === "assinatura") {
        if (!keyFormData.dataExpiracao) {
          toast.error("Data de expiração é obrigatória para assinaturas")
          return
        }
        payload.dataExpiracao = keyFormData.dataExpiracao
      } else {
        if (!keyFormData.limiteTempo) {
          toast.error("Limite de tempo é obrigatório para máquinas")
          return
        }
        payload.limiteTempo = parseInt(keyFormData.limiteTempo)
      }

      const response = await fetch("/api/admin/chaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar chave")
        return
      }

      setCreateKeyDialogOpen(false)
      setKeyFormData({
        tipo: "assinatura",
        dataExpiracao: "",
        limiteTempo: "",
      })
      setSelectedUserId(null)
      fetchUsuarios()
      toast.success("Chave de ativação criada com sucesso!")
    } catch (error) {
      console.error("Erro ao criar chave:", error)
      toast.error("Erro ao criar chave")
    }
  }

  const openCreateKeyDialog = (userId: string) => {
    setSelectedUserId(userId)
    setCreateKeyDialogOpen(true)
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
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">Gerenciar Usuários</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>
                  Gerencie todos os usuários, assinantes e máquinas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="subscriber">Assinantes</SelectItem>
                    <SelectItem value="machine">Máquinas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                      <DialogDescription>
                        Crie um novo usuário ou máquina física
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="userType">Tipo</Label>
                        <Select
                          value={formData.userType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, userType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="subscriber">Assinante</SelectItem>
                            <SelectItem value="machine">Máquina Física</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        Criar Usuário
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            {/* Dialog para criar chave de ativação */}
            <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Chave de Ativação</DialogTitle>
                  <DialogDescription>
                    Crie uma chave de ativação manualmente para o usuário selecionado
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyTipo">Tipo de Chave</Label>
                    <Select
                      value={keyFormData.tipo}
                      onValueChange={(value) =>
                        setKeyFormData({ ...keyFormData, tipo: value as "assinatura" | "maquina" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assinatura">Assinatura</SelectItem>
                        <SelectItem value="maquina">Máquina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {keyFormData.tipo === "assinatura" ? (
                    <div className="space-y-2">
                      <Label htmlFor="dataExpiracao">Data de Expiração</Label>
                      <Input
                        id="dataExpiracao"
                        type="date"
                        value={keyFormData.dataExpiracao}
                        onChange={(e) =>
                          setKeyFormData({ ...keyFormData, dataExpiracao: e.target.value })
                        }
                        required
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-muted-foreground">
                        A chave expirará nesta data
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="limiteTempo">Limite de Tempo (horas)</Label>
                      <Input
                        id="limiteTempo"
                        type="number"
                        min="1"
                        value={keyFormData.limiteTempo}
                        onChange={(e) =>
                          setKeyFormData({ ...keyFormData, limiteTempo: e.target.value })
                        }
                        required
                        placeholder="Ex: 720 (30 dias)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas horas a máquina poderá usar a chave
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCreateKeyDialogOpen(false)
                        setKeyFormData({
                          tipo: "assinatura",
                          dataExpiracao: "",
                          limiteTempo: "",
                        })
                        setSelectedUserId(null)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      <KeyRound className="h-4 w-4 mr-2" />
                      Criar Chave
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo / Status</TableHead>
                    <TableHead>Chave de Ativação</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Dias Restantes</TableHead>
                    <TableHead>Ativado em</TableHead>
                    <TableHead>Cadastrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length > 0 ? (
                    usuarios.map((usuario) => (
                      <ContextMenu key={usuario.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{usuario.name}</span>
                            <span className="text-xs text-muted-foreground">{usuario.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                usuario.userType === "machine"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {usuario.userType === "machine"
                                ? "Máquina"
                                : "Assinante"}
                            </Badge>
                            <Badge
                              variant={usuario.isActive ? "outline" : "destructive"}
                              className={usuario.isActive ? "border-green-500 text-green-600" : ""}
                            >
                              {usuario.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.chaveAtivacao ? (
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex items-center gap-1">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[140px] truncate">
                                  {visibleKeys.has(usuario.id)
                                    ? usuario.chaveAtivacao.chave
                                    : "••••••••••••"}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleKeyVisibility(usuario.id)}
                                  title={visibleKeys.has(usuario.id) ? "Ocultar chave" : "Mostrar chave"}
                                >
                                  {visibleKeys.has(usuario.id) ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(usuario.chaveAtivacao!.chave, usuario.id)}
                                  title="Copiar chave"
                                >
                                  {copiedKey === usuario.id ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.assinatura ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="capitalize">
                                {usuario.assinatura.plano}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                R$ {(usuario.assinatura.valor / 100).toFixed(2)}
                              </span>
                            </div>
                          ) : usuario.chaveAtivacao ? (
                            <Badge variant="secondary" className="capitalize">
                              {usuario.chaveAtivacao.tipo}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className={`font-medium ${getDaysColor(usuario.diasRestantes)}`}>
                              {formatDaysRemaining(usuario.diasRestantes)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.dataAtivacao ? (
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(usuario.dataAtivacao).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(usuario.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </TableCell>
                      </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuLabel>{usuario.name}</ContextMenuLabel>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => openCreateKeyDialog(usuario.id)}
                            className="cursor-pointer"
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Criar Chave de Ativação
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Nenhum usuário encontrado
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

