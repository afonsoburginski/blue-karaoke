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
import { Plus, Key, Clock, CalendarCheck, Copy, Check, Eye, EyeOff, KeyRound, Trash2, List, Laptop, Unlink, Pencil } from "lucide-react"
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

interface ChaveSimples {
  id: string
  chave: string
  tipo: string
  status: string
  limiteTempo?: number | null
  dataInicio?: string | null
  dataExpiracao?: string | null
  usadoEm?: string | null
  ultimoUso?: string | null
  machineId?: string | null
  createdAt: string
}

function diasRestantes(chave: ChaveSimples): number | null {
  const now = Date.now()
  if (chave.dataExpiracao) {
    return Math.max(0, Math.ceil((new Date(chave.dataExpiracao).getTime() - now) / 86400000))
  }
  if (chave.tipo === "maquina" && chave.dataInicio && chave.limiteTempo != null) {
    const fim = new Date(chave.dataInicio).getTime() + chave.limiteTempo * 86400000
    return Math.max(0, Math.ceil((fim - now) / 86400000))
  }
  if (chave.tipo === "maquina" && chave.limiteTempo != null) return chave.limiteTempo
  return null
}

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

  // Dialog "Ver todas as chaves" de um usuário
  const [allKeysDialogOpen, setAllKeysDialogOpen] = useState(false)
  const [allKeysUser, setAllKeysUser] = useState<{ id: string; name: string } | null>(null)
  const [allKeysData, setAllKeysData] = useState<ChaveSimples[]>([])
  const [allKeysLoading, setAllKeysLoading] = useState(false)
  const [copiedChave, setCopiedChave] = useState<string | null>(null)
  const [unlockingChave, setUnlockingChave] = useState<string | null>(null)
  const [deletingChave, setDeletingChave] = useState<string | null>(null)
  const [allKeysTipoFilter, setAllKeysTipoFilter] = useState("all")
  const [allKeysStatusFilter, setAllKeysStatusFilter] = useState("all")
  const [editDiasDialogOpen, setEditDiasDialogOpen] = useState(false)
  const [editDiasChave, setEditDiasChave] = useState<ChaveSimples | null>(null)
  const [editDiasValue, setEditDiasValue] = useState("")
  const [editDiasSaving, setEditDiasSaving] = useState(false)

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

  /** Abre o dialog para CRIAR uma nova chave (nunca edita a existente). */
  const openCreateNewKeyDialog = (userId: string) => {
    setSelectedUserId(userId)
    setSelectedUserChave(null)
    setIsEditingKey(false)
    setKeyFormData({ tipo: "assinatura", dataExpiracao: "", limiteTempo: "" })
    setCreateKeyDialogOpen(true)
  }

  /** Abre o dialog para EDITAR a chave mais recente do usuário. */
  const openEditKeyDialog = (userId: string) => {
    const usuario = usuarios.find(u => u.id === userId)
    const hasChave = usuario?.chaveAtivacao
    if (!hasChave) {
      openCreateNewKeyDialog(userId)
      return
    }
    setSelectedUserId(userId)
    setSelectedUserChave(hasChave)
    setIsEditingKey(true)
    setKeyFormData({
      tipo: hasChave.tipo as "assinatura" | "maquina",
      dataExpiracao: hasChave.dataExpiracao
        ? new Date(hasChave.dataExpiracao).toISOString().split("T")[0]
        : "",
      limiteTempo: hasChave.limiteTempo?.toString() || "",
    })
    setCreateKeyDialogOpen(true)
  }

  /** Mantém retrocompatibilidade com qualquer chamada antiga. */
  const openCreateKeyDialog = (userId: string) => openCreateNewKeyDialog(userId)

  const openAllKeysDialog = async (usuario: Usuario) => {
    setAllKeysUser({ id: usuario.id, name: usuario.name })
    setAllKeysData([])
    setAllKeysLoading(true)
    setAllKeysDialogOpen(true)
    try {
      const res = await fetch(`/api/admin/chaves?userId=${encodeURIComponent(usuario.id)}`, {
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setAllKeysData(data.chaves ?? [])
      }
    } catch {
      toast.error("Erro ao buscar chaves")
    } finally {
      setAllKeysLoading(false)
    }
  }

  const handleUnlockMachineInDialog = async (chaveId: string) => {
    if (!confirm("Desbloquear máquina? A chave poderá ser ativada em outro dispositivo.")) return
    setUnlockingChave(chaveId)
    try {
      const res = await fetch("/api/admin/chaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chaveId, action: "unlock_machine" }),
      })
      if (!res.ok) { toast.error("Erro ao desbloquear"); return }
      setAllKeysData(prev => prev.map(c => c.id === chaveId ? { ...c, machineId: null } : c))
      toast.success("Máquina desbloqueada")
    } catch { toast.error("Erro ao desbloquear") }
    finally { setUnlockingChave(null) }
  }

  const handleDeleteChaveInDialog = async (chaveId: string) => {
    if (!confirm("Deletar esta chave? Quem a estiver usando perderá o acesso.")) return
    setDeletingChave(chaveId)
    try {
      const res = await fetch(`/api/admin/chaves?id=${encodeURIComponent(chaveId)}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erro ao deletar chave"); return }
      setAllKeysData(prev => prev.filter(c => c.id !== chaveId))
      toast.success("Chave deletada")
    } catch { toast.error("Erro ao deletar chave") }
    finally { setDeletingChave(null) }
  }

  const copyChave = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedChave(id)
    setTimeout(() => setCopiedChave(null), 2000)
  }

  const openEditDiasInDialog = (chave: ChaveSimples) => {
    const dias = diasRestantes(chave)
    setEditDiasChave(chave)
    setEditDiasValue(dias != null ? String(dias) : "")
    setEditDiasDialogOpen(true)
  }

  const handleSaveDiasInDialog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDiasChave) return
    const dias = parseInt(editDiasValue, 10)
    if (isNaN(dias) || dias < 0) { toast.error("Informe um número de dias válido (≥ 0)"); return }
    setEditDiasSaving(true)
    try {
      const res = await fetch("/api/admin/chaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editDiasChave.id, diasRestantes: dias }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao salvar"); return }
      setAllKeysData(prev =>
        prev.map(c =>
          c.id === editDiasChave.id
            ? { ...c, dataExpiracao: data.chave?.dataExpiracao ?? c.dataExpiracao, status: dias > 0 ? "ativa" : "expirada" }
            : c
        )
      )
      setEditDiasDialogOpen(false)
      setEditDiasChave(null)
      toast.success("Dias atualizados")
    } catch { toast.error("Erro ao salvar") }
    finally { setEditDiasSaving(false) }
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
            {/* ── Dialog: Todas as chaves do usuário ─────────────────────────── */}
            <Dialog open={allKeysDialogOpen} onOpenChange={setAllKeysDialogOpen}>
              <DialogContent className="w-[95vw] min-w-[900px] max-w-7xl h-[80vh] min-h-[400px] flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b shrink-0">
                  <div>
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <Key className="h-4 w-4" />
                      Chaves de {allKeysUser?.name ?? "Usuário"}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-xs">
                      Todas as chaves de ativação vinculadas a este usuário
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={allKeysTipoFilter} onValueChange={setAllKeysTipoFilter}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="assinatura">Assinatura</SelectItem>
                        <SelectItem value="maquina">Máquina</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={allKeysStatusFilter} onValueChange={setAllKeysStatusFilter}>
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ativa">Ativas</SelectItem>
                        <SelectItem value="expirada">Expiradas</SelectItem>
                        <SelectItem value="revogada">Revogadas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setAllKeysDialogOpen(false)
                        if (allKeysUser) openCreateNewKeyDialog(allKeysUser.id)
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nova Chave
                    </Button>
                  </div>
                </div>

                {/* Sub-dialog: editar dias */}
                <Dialog open={editDiasDialogOpen} onOpenChange={setEditDiasDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar dias restantes</DialogTitle>
                      <DialogDescription>
                        Defina quantos dias restam. A data de expiração será atualizada.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveDiasInDialog} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editDiasDialog">Dias restantes</Label>
                        <Input
                          id="editDiasDialog"
                          type="number"
                          min={0}
                          value={editDiasValue}
                          onChange={(e) => setEditDiasValue(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => { setEditDiasDialogOpen(false); setEditDiasChave(null) }}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={editDiasSaving}>
                          {editDiasSaving ? "Salvando…" : "Salvar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Corpo: tabela */}
                <div className="flex-1 overflow-auto">
                  {allKeysLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      Carregando…
                    </div>
                  ) : (() => {
                    const filtered = allKeysData.filter(c =>
                      (allKeysTipoFilter === "all" || c.tipo === allKeysTipoFilter) &&
                      (allKeysStatusFilter === "all" || c.status === allKeysStatusFilter)
                    )
                    return filtered.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Nenhuma chave encontrada.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chave</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Limite / Expiração</TableHead>
                            <TableHead>Máquina</TableHead>
                            <TableHead>Último Uso</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((chave) => {
                            const dias = diasRestantes(chave)
                            return (
                              <TableRow key={chave.id}>
                                <TableCell className="font-mono text-sm">{chave.chave}</TableCell>
                                <TableCell>
                                  <Badge variant={chave.tipo === "maquina" ? "secondary" : "default"}>
                                    {chave.tipo === "maquina" ? "Máquina" : "Assinatura"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={chave.status === "ativa" ? "default" : chave.status === "expirada" ? "destructive" : "secondary"}>
                                    {chave.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {chave.tipo === "maquina" ? (
                                    dias != null ? `${dias} dias` : chave.limiteTempo != null ? `${chave.limiteTempo} dias (não usada)` : "-"
                                  ) : chave.dataExpiracao ? (
                                    <>
                                      {new Date(chave.dataExpiracao).toLocaleDateString("pt-BR")}
                                      {dias != null && <span className="text-muted-foreground ml-1">({dias} dias)</span>}
                                    </>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>
                                  {chave.machineId ? (
                                    <div className="flex items-center gap-1.5">
                                      <Laptop className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[80px]" title={chave.machineId}>
                                        {chave.machineId.slice(0, 8)}…
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Livre</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {chave.ultimoUso
                                    ? new Date(chave.ultimoUso).toLocaleDateString("pt-BR")
                                    : chave.usadoEm
                                    ? new Date(chave.usadoEm).toLocaleDateString("pt-BR")
                                    : "Nunca"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => copyChave(chave.chave, chave.id)} title="Copiar chave">
                                      {copiedChave === chave.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEditDiasInDialog(chave)} title="Editar dias restantes">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    {chave.machineId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-orange-500 hover:text-orange-600"
                                        onClick={() => handleUnlockMachineInDialog(chave.id)}
                                        disabled={unlockingChave === chave.id}
                                        title="Desbloquear máquina"
                                      >
                                        <Unlink className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteChaveInDialog(chave.id)}
                                      disabled={deletingChave === chave.id}
                                      title="Deletar chave"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )
                  })()}
                </div>

                {/* Rodapé */}
                <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {allKeysData.filter(c =>
                      (allKeysTipoFilter === "all" || c.tipo === allKeysTipoFilter) &&
                      (allKeysStatusFilter === "all" || c.status === allKeysStatusFilter)
                    ).length} de {allKeysData.length} chave{allKeysData.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </DialogContent>
            </Dialog>

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
                  <DialogTitle>
                    {isEditingKey ? "Editar Chave de Ativação" : "Nova Chave de Ativação"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditingKey
                      ? "Altere a data de expiração ou limite em dias da chave existente."
                      : "Crie uma nova chave vinculada a este usuário. Chaves de máquina standalone (sem usuário) devem ser criadas na página Chaves."}
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
                        <SelectItem value="assinatura">Assinatura (data de expiração)</SelectItem>
                        <SelectItem value="maquina">Máquina (limite em dias)</SelectItem>
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
                          {/* Sempre disponível: cria mais uma chave nova */}
                          <ContextMenuItem
                            onClick={() => openCreateNewKeyDialog(usuario.id)}
                            className="cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Chave de Ativação
                          </ContextMenuItem>
                          {/* Editar a chave mais recente (só mostra se tiver alguma) */}
                          {usuario.chaveAtivacao && (
                            <ContextMenuItem
                              onClick={() => openEditKeyDialog(usuario.id)}
                              className="cursor-pointer"
                            >
                              <KeyRound className="h-4 w-4 mr-2" />
                              Editar Última Chave
                            </ContextMenuItem>
                          )}
                          {/* Dialog com todas as chaves do usuário */}
                          <ContextMenuItem
                            onClick={() => openAllKeysDialog(usuario)}
                            className="cursor-pointer"
                          >
                            <List className="h-4 w-4 mr-2" />
                            Ver Todas as Chaves
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

