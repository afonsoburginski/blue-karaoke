"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useDropzone } from "react-dropzone"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export default function PerfilPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading, refetch } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)

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

    if (user && slug && user.slug !== slug) {
      router.push(`/${user.slug}/perfil`)
      return
    }

    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    }
  }, [user, slug, authLoading, router])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: false,
  })

  const removeProfileImage = () => {
    setProfileImage(null)
    setProfileImagePreview(null)
  }

  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      // Validações
      if (formData.newPassword && formData.newPassword.length < 6) {
        setErrorMessage("A nova senha deve ter pelo menos 6 caracteres")
        setIsLoading(false)
        return
      }

      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        setErrorMessage("As senhas não coincidem")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
          avatar: profileImagePreview || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil")
      }

      // Atualizar dados do usuário
      await refetch()

      setSuccessMessage("Perfil atualizado com sucesso!")
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
      setProfileImage(null)
      setProfileImagePreview(null)

      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao atualizar perfil")
    } finally {
      setIsLoading(false)
    }
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Perfil</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Mensagens de Sucesso/Erro */}
          {successMessage && (
            <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Header do Perfil */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b">
            <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                    {profileImagePreview || user.avatar ? (
                      <AvatarImage src={profileImagePreview || user.avatar || undefined} alt={user.name || "Usuário"} />
                    ) : (
                      <AvatarFallback className="text-3xl font-semibold">{getInitials()}</AvatarFallback>
                    )}
                  </Avatar>
              <div
                {...getRootProps()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <input {...getInputProps()} />
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-1">{user.name || "Usuário"}</h2>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize seu nome e email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alterar Senha */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Altere sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="Digite sua senha atual"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="pl-9 h-11"
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirme a nova senha"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-9 h-11"
                      minLength={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Foto de Perfil - Card Separado */}
          {profileImage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Preview da Foto
                </CardTitle>
                <CardDescription>
                  Foto selecionada para upload
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileImagePreview || undefined} alt="Preview" />
                    <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{profileImage.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(profileImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeProfileImage}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Salvar */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (user) {
                  setFormData({
                    name: user.name,
                    email: user.email,
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }
                setProfileImage(null)
                setProfileImagePreview(null)
                setErrorMessage("")
                setSuccessMessage("")
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              size="lg"
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

