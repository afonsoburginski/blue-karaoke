"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { navigateFast } from "@/lib/navigation"
import { useMusicas, type Musica as MusicaType } from "@/hooks/use-musicas"
import { useQueryClient } from "@tanstack/react-query"
import { useDropzone } from "react-dropzone"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Search,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"

// Usar tipo do hook useMusicas
type Musica = MusicaType

export default function MusicasPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  
  // Usar React Query para buscar músicas com cache
  const {
    data: musics = [],
  } = useMusicas({
    enabled: !!user && !!slug,
  })
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 800) // Debounce de 800ms

  useEffect(() => {
    async function unwrapParams() {
      const { slug: slugValue } = await params
      setSlug(slugValue as string)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
        navigateFast(router, "/login")
      return
    }
    if (slug && user.slug !== slug) {
      navigateFast(router, `/${user.slug}/musicas`)
      return
    }
  }, [user, slug, authLoading, router])

  // Não precisa de fetch manual - React Query gerencia cache automaticamente

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return "-"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return "-"
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta música?")) return
    try {
      const response = await fetch(`/api/musicas/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Erro ao deletar música")
      
      // Atualização otimista - remover do cache imediatamente
      queryClient.setQueryData<typeof musics>(["musicas"], (old) => 
        old ? old.filter((music) => music.id !== id) : []
      )
      
      // Invalidar para refetch em background (caso a API tenha retornado erro)
      queryClient.invalidateQueries({ queryKey: ["musicas"] })
    } catch (error) {
      console.error("Erro ao deletar música:", error)
      // Reverter atualização otimista em caso de erro
      queryClient.invalidateQueries({ queryKey: ["musicas"] })
      alert("Erro ao deletar música. Tente novamente.")
    }
  }

  const columns = useMemo<ColumnDef<Musica>[]>(() => {
    const baseColumns: ColumnDef<Musica>[] = [
      {
        accessorKey: "titulo",
        header: "Música",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("titulo")}</div>
        ),
      },
      {
        accessorKey: "artista",
        header: "Artista",
      },
      {
        accessorKey: "codigo",
        header: "Código",
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {row.getValue("codigo")}
          </code>
        ),
      },
      {
        accessorKey: "tamanho",
        header: "Tamanho",
        cell: ({ row }) => formatFileSize(row.getValue("tamanho")),
      },
      {
        accessorKey: "duracao",
        header: "Duração",
        cell: ({ row }) => formatDuration(row.getValue("duracao")),
      },
      {
        accessorKey: "createdAt",
        header: "Data",
        cell: ({ row }) => {
          const date = new Date(row.getValue("createdAt"))
          return date.toLocaleDateString("pt-BR")
        },
      },
    ]

    if (user?.role === "admin") {
      baseColumns.push({
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const music = row.original
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(music.arquivo, "_blank")}
                title="Reproduzir música"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(music.id)}
                title="Deletar música"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )
        },
      })
    } else {
      baseColumns.push({
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const music = row.original
          return (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(music.arquivo, "_blank")}
                title="Reproduzir música"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      })
    }

    return baseColumns
  }, [user?.role])

  // Função para normalizar texto (remover acentos e converter para lowercase)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .trim()
  }

  // Filtrar dados antes de passar para a tabela (usando debouncedSearchTerm para evitar renderizações pesadas)
  const filteredData = useMemo<Musica[]>(() => {
    if (!debouncedSearchTerm) return musics
    
    const normalizedSearch = normalizeText(debouncedSearchTerm)
    return musics.filter((music) => {
      const titulo = normalizeText(music.titulo || "")
      const artista = normalizeText(music.artista || "")
      const codigo = normalizeText(music.codigo || "")
      return (
        titulo.includes(normalizedSearch) ||
        artista.includes(normalizedSearch) ||
        codigo.includes(normalizedSearch)
      )
    })
  }, [musics, debouncedSearchTerm])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 100, // 100 músicas por página
      },
    },
    state: {
      sorting,
      columnFilters,
    },
  })

  // Voltar para primeira página quando pesquisar (usando debouncedSearchTerm)
  useEffect(() => {
    table.setPageIndex(0)
  }, [debouncedSearchTerm, table])

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

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setErrors({})

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Criar FormData para enviar o arquivo
        const formData = new FormData()
        formData.append("file", file)

        // Usar XMLHttpRequest para ter progresso real
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100)
              setUploadProgress((prev) => ({ ...prev, [i]: percentComplete }))
            }
          })

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadedFiles((prev) => new Set([...prev, i.toString()]))
              resolve()
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText)
                reject(new Error(errorData.error || "Erro ao fazer upload"))
              } catch {
                reject(new Error(`Erro ${xhr.status}: ${xhr.statusText}`))
              }
            }
          })

          xhr.addEventListener("error", () => {
            reject(new Error("Erro de rede ao fazer upload"))
          })

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelado"))
          })

          xhr.open("POST", "/api/upload")
          xhr.send(formData)
        })
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [i]: error instanceof Error ? error.message : "Erro ao fazer upload",
        }))
      }
    }

    // Invalidar cache para refetch em background após upload
    // Não precisa buscar manualmente - React Query faz isso automaticamente
    queryClient.invalidateQueries({ queryKey: ["musicas"] })

    setUploading(false)
    setFiles([])
    setUploadProgress({})
    setUploadedFiles(new Set())
    setDialogOpen(false)
  }

  // Não mostrar loading durante navegação - React Query tem cache
  // Só renderizar se temos user e slug, caso contrário deixar useEffect redirecionar silenciosamente
  if (!user || !slug) {
    return null // Redirecionamento silencioso sem loading
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
            <h1 className="text-lg font-semibold">Músicas</h1>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle>Todas as Músicas</CardTitle>
                  <CardDescription>
                    {user.role === "admin"
                      ? "Gerencie seu catálogo de músicas de karaokê"
                      : "Explore o catálogo de músicas de karaokê"}
                  </CardDescription>
                </div>
                {user.role === "admin" && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Músicas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Toolbar da data-table */}
              <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, artista ou código..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Music className="h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma música encontrada
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação */}
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  {debouncedSearchTerm ? (
                    <>
                      Mostrando {table.getRowModel().rows.length} de {filteredData.length} músicas
                      {filteredData.length !== musics.length && (
                        <span className="ml-1">(de {musics.length} no total)</span>
                      )}
                    </>
                  ) : (
                    <>
                      Mostrando {table.getRowModel().rows.length} de {musics.length} músicas
                      {table.getPageCount() > 1 && (
                        <span className="ml-1">
                          (página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()})
                        </span>
                      )}
                    </>
                  )}
                </div>
                {table.getPageCount() > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      ← Anterior
                    </Button>
                    <div className="text-sm font-medium min-w-[120px] text-center">
                      Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Próxima →
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="min-w-[1200px] max-w-[95vw] w-[95vw] min-h-[85vh] h-[85vh] max-h-[85vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <DialogTitle>Adicionar Músicas</DialogTitle>
                <DialogDescription>
                  Faça upload de vídeos de karaokê para a nuvem
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                    flex-1 w-full h-full min-h-0 flex items-center justify-center
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

                {files.length > 0 && (
                  <div className="space-y-3">
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
