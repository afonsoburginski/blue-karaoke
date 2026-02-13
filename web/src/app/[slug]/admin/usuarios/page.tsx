"use client"

import { useEffect, useState, startTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAdminUsuarios, type Usuario } from "@/hooks/use-admin-usuarios"
import { useQueryClient } from "@tanstack/react-query"
import { memoryCache } from "@/lib/memory-cache"
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
import { Plus, Key, Clock, CalendarCheck, Copy, Check, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react"
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

export default function AdminUsuariosPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading, isRoleLoading } = useAuth()
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState<"subscriber" | "machine" | "all">("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all")
  
  // Usar React Query para buscar usuários com cache
  // initialData garante que dados do cache aparecem imediatamente
  const {
    data: usuarios = [],
    error,
    refetch,
  } = useAdminUsuarios({
    tipo: tipoFilter,
    status: statusFilter,
    enabled: !!user && user.role === "admin" && !!slug,
  })
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
  const [selectedUserChave, setSelectedUserChave] = useState<Usuario["chaveAtivacao"] | null>(null)
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
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
    if (authLoading || isRoleLoading) return

    // Aguardar um pouco para garantir que a sessão foi carregada
    const timeoutId = setTimeout(() => {
      if (!user) {
        navigateFast(router, "/login")
        return
      }

      // Se não for admin, redirecionar
      if (user.role !== "admin") {
        navigateFast(router, `/${user.slug}`)
        return
      }

    }, 100)

    return () => clearTimeout(timeoutId)
  }, [user, slug, authLoading, isRoleLoading, router])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const queryKey = ["admin", "usuarios", tipoFilter, statusFilter] as const
    const previousUsuarios = queryClient.getQueryData<Usuario[]>(queryKey)

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

      // Otimista: adicionar novo usuário na tabela na hora
      const newUserFromApi = data.user
      if (newUserFromApi) {
        const optimisticUser: Usuario = {
          id: newUserFromApi.id,
          slug: newUserFromApi.slug,
          name: newUserFromApi.name,
          email: newUserFromApi.email,
          avatar: null,
          role: newUserFromApi.role,
          userType: newUserFromApi.userType,
          isActive: newUserFromApi.isActive ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assinatura: null,
          chaveAtivacao: null,
          diasRestantes: null,
          dataAtivacao: null,
        }
        queryClient.setQueryData<Usuario[]>(queryKey, (old) =>
          old ? [optimisticUser, ...old] : [optimisticUser]
        )
      }

      setDialogOpen(false)
      setFormData({
        name: "",
        email: "",
        password: "",
        userType: "subscriber",
        role: "user",
      })
      memoryCache.invalidatePrefix("admin:usuarios")
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] })
      toast.success("Usuário criado com sucesso!")
    } catch (error) {
      if (previousUsuarios) {
        queryClient.setQueryData(queryKey, previousUsuarios)
      }
      console.error("Erro ao criar usuário:", error)
      toast.error("Erro ao criar usuário")
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    if (keyFormData.tipo === "assinatura" && !keyFormData.dataExpiracao) {
      toast.error("Data de expiração é obrigatória para assinaturas")
      return
    }
    if (keyFormData.tipo === "maquina" && !keyFormData.limiteTempo) {
      toast.error("Limite de tempo é obrigatório para máquinas")
      return
    }

    const queryKey = ["admin", "usuarios", tipoFilter, statusFilter] as const
    const previousUsuarios = queryClient.getQueryData<Usuario[]>(queryKey)
    const editingKey = !!selectedUserChave

    // Calcular dias restantes a partir do formulário
    const dataExpiracaoStr =
      keyFormData.tipo === "assinatura" ? keyFormData.dataExpiracao : null
    const limiteTempoNum =
      keyFormData.tipo === "maquina"
        ? parseInt(keyFormData.limiteTempo, 10)
        : null
    const diasRestantes =
      dataExpiracaoStr != null
        ? Math.max(
            0,
            Math.ceil(
              (new Date(dataExpiracaoStr).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000)
            )
          )
        : limiteTempoNum

    // Otimista: atualizar tabela na hora com dados do formulário
    const optimisticChave = {
      id: selectedUserChave?.id ?? `opt-${Date.now()}`,
      chave: selectedUserChave?.chave ?? "••••••••••••",
      tipo: keyFormData.tipo,
      status: "ativa" as const,
      dataExpiracao: dataExpiracaoStr ? new Date(dataExpiracaoStr).toISOString() : null,
      usadoEm: null as Date | string | null,
      ultimoUso: null as Date | string | null,
      limiteTempo: limiteTempoNum ?? null,
    }

    queryClient.setQueryData<Usuario[]>(queryKey, (old) =>
      old
        ? old.map((u) =>
            u.id === selectedUserId
              ? {
                  ...u,
                  chaveAtivacao: optimisticChave,
                  diasRestantes,
                  dataAtivacao: u.dataAtivacao || new Date().toISOString(),
                }
              : u
          )
        : old
    )

    setCreateKeyDialogOpen(false)
    setKeyFormData({
      tipo: "assinatura",
      dataExpiracao: "",
      limiteTempo: "",
    })
    const userIdToSave = selectedUserId
    setSelectedUserId(null)
    setSelectedUserChave(null)
    setIsEditingKey(false)

    try {
      const payload: any = {
        tipo: keyFormData.tipo,
        userId: userIdToSave,
      }
      if (keyFormData.tipo === "assinatura") {
        payload.dataExpiracao = keyFormData.dataExpiracao
      } else {
        payload.limiteTempo = parseInt(keyFormData.limiteTempo, 10)
      }

      const response = await fetch("/api/admin/chaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (previousUsuarios) {
          queryClient.setQueryData(queryKey, previousUsuarios)
        }
        toast.error(data.error || "Erro ao criar chave")
        return
      }

      // Ajustar cache com resposta real (id e chave string)
      const chave = data.chave
      if (chave && userIdToSave) {
        queryClient.setQueryData<Usuario[]>(queryKey, (old) =>
          old
            ? old.map((u) =>
                u.id === userIdToSave
                  ? {
                      ...u,
                      chaveAtivacao: {
                        ...u.chaveAtivacao!,
                        id: chave.id,
                        chave: chave.chave,
                        tipo: chave.tipo,
                        status: chave.status ?? "ativa",
                        dataExpiracao: chave.dataExpiracao ?? null,
                        limiteTempo: chave.limiteTempo ?? null,
                      },
                    }
                  : u
              )
            : old
        )
      }

      memoryCache.invalidatePrefix("admin:usuarios")
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] })
      toast.success(
        data.message ||
          (editingKey ? "Chave atualizada com sucesso!" : "Chave de ativação criada com sucesso!")
      )
    } catch (error) {
      if (previousUsuarios) {
        queryClient.setQueryData(queryKey, previousUsuarios)
      }
      console.error("Erro ao criar chave:", error)
      toast.error("Erro ao criar chave")
    }
  }

  const openCreateKeyDialog = (userId: string) => {
    const usuario = usuarios.find(u => u.id === userId)
    const hasChave = usuario?.chaveAtivacao
    
    setSelectedUserId(userId)
    setSelectedUserChave(hasChave || null)
    setIsEditingKey(!!hasChave)
    
    // Preencher formulário com dados existentes se estiver editando
    if (hasChave) {
      setKeyFormData({
        tipo: hasChave.tipo as "assinatura" | "maquina",
        dataExpiracao: hasChave.dataExpiracao 
          ? new Date(hasChave.dataExpiracao).toISOString().split("T")[0]
          : "",
        limiteTempo: hasChave.limiteTempo?.toString() || "",
      })
    } else {
      setKeyFormData({
        tipo: "assinatura",
        dataExpiracao: "",
        limiteTempo: "",
      })
    }
    
    setCreateKeyDialogOpen(true)
  }

  const openDeleteDialog = (usuario: Usuario) => {
    setUserToDelete(usuario)
    setDeleteDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    const deletedUser = userToDelete
    const queryKey = ["admin", "usuarios", tipoFilter, statusFilter] as const

    // Otimista: remove da tabela na hora
    const previousUsuarios = queryClient.getQueryData<Usuario[]>(queryKey)
    queryClient.setQueryData<Usuario[]>(queryKey, (old) =>
      old ? old.filter((u) => u.id !== deletedUser.id) : old
    )
    setDeleteDialogOpen(false)
    setUserToDelete(null)

    try {
      const response = await fetch(`/api/admin/delete-user?email=${encodeURIComponent(deletedUser.email)}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        // Reverter em caso de erro
        if (previousUsuarios) {
          queryClient.setQueryData(queryKey, previousUsuarios)
        }
        toast.error(data.error || "Erro ao deletar usuário")
        return
      }

      memoryCache.invalidatePrefix("admin:usuarios")
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] })
      toast.success(`Usuário ${deletedUser.name} deletado com sucesso!`)
    } catch (error) {
      // Reverter em caso de erro de rede
      if (previousUsuarios) {
        queryClient.setQueryData(queryKey, previousUsuarios)
      }
      console.error("Erro ao deletar usuário:", error)
      toast.error("Erro ao deletar usuário")
    }
  }

  // Só mostrar loading se realmente não temos dados essenciais ou se está carregando role
  // Não mostrar loading durante navegação - React Query tem cache
  // Só renderizar se temos user e slug, caso contrário deixar useEffect redirecionar silenciosamente
  if (!user || !slug) {
    return null // Redirecionamento silencioso sem loading
  }

  // Se não for admin, não renderizar nada enquanto redireciona (o useEffect já cuida do redirect)
  if (user.role !== "admin") {
    return null // Redirecionamento silencioso
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
                <Select 
                  value={tipoFilter} 
                  onValueChange={(value) => setTipoFilter(value as "subscriber" | "machine" | "all")}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="subscriber">Assinantes</SelectItem>
                    <SelectItem value="machine">Máquinas</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => setStatusFilter(value as "active" | "inactive" | "all")}
                >
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
            {/* Dialog de Confirmação de Deleção */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Exclusão</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja deletar o usuário <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
                    <br />
                    <br />
                    Esta ação não pode ser desfeita. Todas as assinaturas, histórico e dados relacionados serão removidos permanentemente.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 justify-end mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setUserToDelete(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteUser}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createKeyDialogOpen} onOpenChange={(open) => {
              setCreateKeyDialogOpen(open)
              if (!open) {
                setKeyFormData({
                  tipo: "assinatura",
                  dataExpiracao: "",
                  limiteTempo: "",
                })
                setSelectedUserId(null)
                setSelectedUserChave(null)
                setIsEditingKey(false)
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditingKey ? "Editar Chave de Ativação" : "Criar Chave de Ativação"}</DialogTitle>
                  <DialogDescription>
                    {isEditingKey
                      ? "Altere o tipo (assinatura/máquina), data de expiração ou limite em dias da chave existente."
                      : "Crie uma chave de ativação manualmente para o usuário selecionado."
                    }
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
                    <p className="text-xs text-muted-foreground">
                      Assinatura usa data de expiração; máquina usa limite em dias.
                    </p>
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
                      <Label htmlFor="limiteTempo">Limite (dias)</Label>
                      <Input
                        id="limiteTempo"
                        type="number"
                        min="1"
                        value={keyFormData.limiteTempo}
                        onChange={(e) =>
                          setKeyFormData({ ...keyFormData, limiteTempo: e.target.value })
                        }
                        required
                        placeholder="Ex: 30"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantos dias a máquina poderá usar a chave
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
                        setSelectedUserChave(null)
                        setIsEditingKey(false)
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      <KeyRound className="h-4 w-4 mr-2" />
                      {isEditingKey ? "Salvar Alterações" : "Criar Chave"}
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
                  {error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-destructive">Erro ao carregar usuários. Tente novamente.</div>
                      </TableCell>
                    </TableRow>
                  ) : usuarios.length > 0 ? (
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
                            {usuario.chaveAtivacao ? "Editar Chave de Ativação" : "Criar Chave de Ativação"}
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => openDeleteDialog(usuario)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar Usuário
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

