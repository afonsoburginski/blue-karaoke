"use client"

import { useEffect, useRef, useState } from "react"
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
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Upload, Trash2, Loader2, CheckCircle2, ImageIcon, Monitor } from "lucide-react"

export default function AparenciaPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigateFast(router, `/${slug}`)
    }
  }, [isLoading, user, router, slug])

  // Busca o banner atual ao carregar
  useEffect(() => {
    fetch("/api/admin/banner")
      .then((r) => r.json())
      .then((d) => setCurrentUrl(d.url || null))
      .catch(() => {})
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setSuccessMsg(null)
    setErrorMsg(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      // 1. Obter signed URL (arquivo nunca passa pelo servidor Next.js)
      const signRes = await fetch("/api/admin/banner/sign", { method: "POST" })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error ?? "Erro ao gerar URL de upload")

      // 2. Enviar arquivo diretamente ao Supabase Storage via PUT
      const putRes = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      })
      if (!putRes.ok) throw new Error(`Erro ao enviar arquivo (${putRes.status})`)

      // 3. Confirmar no banco de dados
      const confirmRes = await fetch("/api/admin/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: signData.path }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmData.error ?? "Erro ao confirmar banner")

      setCurrentUrl(confirmData.url)
      setSelectedFile(null)
      setPreviewUrl(null)
      setSuccessMsg("Banner atualizado! O app desktop irá buscar a nova imagem automaticamente.")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar banner")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Remover o banner personalizado e voltar ao padrão?")) return
    setIsRemoving(true)
    setErrorMsg(null)
    try {
      await fetch("/api/admin/banner", { method: "DELETE" })
      setCurrentUrl(null)
      setSuccessMsg("Banner removido. O app irá usar o fundo padrão.")
    } catch {
      setErrorMsg("Erro ao remover banner")
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        userName={user?.name ?? undefined}
        userEmail={user?.email ?? undefined}
        slug={slug}
        userRole={user?.role ?? undefined}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">Aparência do App Desktop</h1>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 max-w-3xl">

          {/* Banner atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Banner de fundo — tela inicial
              </CardTitle>
              <CardDescription>
                Imagem exibida como fundo na tela inicial do app desktop (Blue Karaokê).
                Recomendado: <strong>1920 × 1080 px</strong>, formato JPEG / PNG / WebP, até 5 MB.
                Quando o app estiver online, ele baixa e exibe automaticamente o banner mais recente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Preview atual */}
              <div className="rounded-xl overflow-hidden border bg-muted aspect-video flex items-center justify-center relative">
                {currentUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUrl}
                    alt="Banner atual"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 opacity-30" />
                    <p className="text-sm">Nenhum banner personalizado — app usa imagem padrão</p>
                  </div>
                )}
                {currentUrl && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Banner atual
                  </div>
                )}
              </div>

              {/* Preview do arquivo selecionado */}
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-blue-500/50 aspect-video relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview do novo banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                    Novo banner (aguardando envio)
                  </div>
                </div>
              )}

              {/* Área de upload */}
              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="banner-file-input"
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar imagem
                  </Button>

                  {selectedFile && (
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploading ? "Enviando..." : "Confirmar e publicar"}
                    </Button>
                  )}

                  {currentUrl && !selectedFile && (
                    <Button
                      variant="destructive"
                      onClick={handleRemove}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Remover banner
                    </Button>
                  )}
                </div>

                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: <strong>{selectedFile.name}</strong>{" "}
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Feedback */}
              {successMsg && (
                <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-green-700 dark:text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-700 dark:text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações de como funciona */}
          <Card className="bg-muted/40">
            <CardContent className="pt-4 text-sm text-muted-foreground space-y-1">
              <p>• O banner é armazenado no Supabase Storage e servido por CDN.</p>
              <p>• O app desktop verifica se há um novo banner ao iniciar e a cada 30 minutos.</p>
              <p>• A imagem é cacheada localmente; se o app estiver offline, usa a última versão baixada.</p>
              <p>• Se nenhum banner for definido, o app exibe a imagem padrão embutida.</p>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
