"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useDropzone } from "react-dropzone"
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
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Music,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  FileVideo,
} from "lucide-react"

interface MusicFile {
  id: string
  title: string
  artist: string
  code: string
  size: number
  duration?: string
  uploadedAt: string
  status: "active" | "processing" | "error"
}

export default function MusicasPage() {
  const router = useRouter()
  const params = useParams()
  const [slug, setSlug] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Dados mockados - substituir por dados reais da API
  const [musics, setMusics] = useState<MusicFile[]>([
    {
      id: "1",
      title: "Bohemian Rhapsody",
      artist: "Queen",
      code: "01001",
      size: 45.2,
      duration: "5:55",
      uploadedAt: "2024-01-15",
      status: "active",
    },
    {
      id: "2",
      title: "Hotel California",
      artist: "Eagles",
      code: "01002",
      size: 52.8,
      duration: "6:30",
      uploadedAt: "2024-01-14",
      status: "active",
    },
    {
      id: "3",
      title: "Stairway to Heaven",
      artist: "Led Zeppelin",
      code: "01003",
      size: 48.5,
      duration: "8:02",
      uploadedAt: "2024-01-13",
      status: "active",
    },
  ])

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
    setErrors({})
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      return newFiles
    })
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index.toString()]
      return newErrors
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setErrors({})

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)
      formData.append("filename", file.name)

      try {
        // TODO: Implementar upload real para a API
        // const response = await fetch("/api/upload", {
        //   method: "POST",
        //   body: formData,
        // })

        // Simulação de upload com progresso
        await new Promise<void>((resolve) => {
          let progress = 0
          const interval = setInterval(() => {
            progress += 10
            setUploadProgress((prev) => ({
              ...prev,
              [i]: progress,
            }))
            if (progress >= 100) {
              clearInterval(interval)
              setUploadedFiles((prev) => new Set([...prev, i.toString()]))
              resolve()
            }
          }, 200)
        })

        // Adicionar à lista de músicas após upload
        const newMusic: MusicFile = {
          id: Date.now().toString(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Artista Desconhecido",
          code: String(10000 + musics.length + 1).padStart(5, "0"),
          size: file.size / (1024 * 1024), // MB
          uploadedAt: new Date().toISOString().split("T")[0],
          status: "active",
        }
        setMusics((prev) => [newMusic, ...prev])
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [i]: error instanceof Error ? error.message : "Erro ao fazer upload",
        }))
      }
    }

    setUploading(false)
    setFiles([])
    setUploadProgress({})
    setUploadedFiles(new Set())
  }

  const handleDelete = (id: string) => {
    setMusics((prev) => prev.filter((music) => music.id !== id))
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
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Músicas</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          {/* Área de Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Músicas</CardTitle>
              <CardDescription>
                Faça upload de vídeos de karaokê para a nuvem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Solte os arquivos aqui"
                        : "Arraste e solte vídeos aqui"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou clique para selecionar arquivos
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos suportados: MP4, AVI, MOV, MKV
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    <FileVideo className="h-4 w-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                </div>
              </div>

              {/* Lista de arquivos selecionados */}
              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      {files.length} arquivo(s) selecionado(s)
                    </h3>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      size="sm"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar Todos
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 border rounded-lg"
                      >
                        <Music className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          {uploadProgress[index] !== undefined && (
                            <div className="mt-2">
                              <Progress
                                value={uploadProgress[index]}
                                className="h-1"
                              />
                            </div>
                          )}
                          {errors[index] && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors[index]}
                            </p>
                          )}
                          {uploadedFiles.has(index.toString()) && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Enviado com sucesso
                            </p>
                          )}
                        </div>
                        {!uploading && !uploadedFiles.has(index.toString()) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Músicas */}
          <Card>
            <CardHeader>
              <CardTitle>Todas as Músicas</CardTitle>
              <CardDescription>
                Gerencie seu catálogo de músicas de karaokê
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Música</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {musics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Music className="h-12 w-12 text-muted-foreground opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            Nenhuma música cadastrada ainda
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Faça upload de vídeos usando a área acima
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    musics.map((music, index) => (
                      <TableRow key={music.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{music.title}</div>
                        </TableCell>
                        <TableCell>{music.artist}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {music.code}
                          </code>
                        </TableCell>
                        <TableCell>{music.size.toFixed(1)} MB</TableCell>
                        <TableCell>{music.duration || "-"}</TableCell>
                        <TableCell>
                          {new Date(music.uploadedAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(music.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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

