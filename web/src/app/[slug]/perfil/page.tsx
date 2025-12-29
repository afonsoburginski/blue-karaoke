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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function PerfilPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading, refetch } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: "",
    email: "",
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
    
    // Limpar erros ao digitar
    if (name === "newPassword" || name === "confirmPassword") {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      // Validações
      const errors: typeof fieldErrors = {}
      
      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          errors.newPassword = "A senha deve ter pelo menos 6 caracteres"
        }
        if (formData.newPassword !== formData.confirmPassword) {
          errors.confirmPassword = "As senhas não coincidem"
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setIsLoading(false)
        return
      }
      
      setFieldErrors({})

      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
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
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">Perfil</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
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
              <Avatar className="h-20 w-20 ring-2 ring-border">
                {profileImagePreview || user.avatar ? (
                  <AvatarImage src={profileImagePreview || user.avatar || undefined} alt={user.name || "Usuário"} />
                ) : (
                  <AvatarFallback className="text-2xl font-semibold">{getInitials()}</AvatarFallback>
                )}
              </Avatar>
              <div
                {...getRootProps()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <input {...getInputProps()} />
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-1">{user.name || "Usuário"}</h2>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Formulário usando Field components */}
          <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Informações Pessoais</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Nome</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              <FieldSet>
                <FieldLegend>Alterar Senha</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={!!fieldErrors.newPassword}>
                    <FieldLabel htmlFor="newPassword">Nova Senha</FieldLabel>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      minLength={6}
                      aria-invalid={!!fieldErrors.newPassword}
                    />
                    {fieldErrors.newPassword && (
                      <FieldError>{fieldErrors.newPassword}</FieldError>
                    )}
                  </Field>
                  <Field data-invalid={!!fieldErrors.confirmPassword}>
                    <FieldLabel htmlFor="confirmPassword">Confirmar Senha</FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      minLength={6}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                    {fieldErrors.confirmPassword && (
                      <FieldError>{fieldErrors.confirmPassword}</FieldError>
                    )}
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Preview da Foto */}
              {profileImage && (
                <>
                  <FieldSeparator />
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profileImagePreview || undefined} alt="Preview" />
                      <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profileImage.name}</p>
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
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              <FieldSeparator />

              {/* Botões de Ação */}
              <Field orientation="horizontal">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (user) {
                      setFormData({
                        name: user.name,
                        email: user.email,
                        newPassword: "",
                        confirmPassword: "",
                      })
                    }
                    setProfileImage(null)
                    setProfileImagePreview(null)
                    setErrorMessage("")
                    setSuccessMessage("")
                    setFieldErrors({})
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

