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
import { memoryCache } from "@/lib/memory-cache"

// Usar tipo do hook useMusicas
type Musica = MusicaType

// Preview de arquivo para editar metadados antes do upload (mesmo esquema do banco)
export interface PreviewMusica {
  file: File
  codigo: string
  artista: string
  titulo: string
}

function InlineEditInput({
  defaultValue,
  onSave,
  onCancel,
  saving,
  variant = "default",
}: {
  defaultValue: string
  onSave: (value: string) => void
  onCancel: () => void
  saving: boolean
  variant?: "default" | "title" | "code"
}) {
  const elRef = React.useRef<HTMLSpanElement>(null)

  const mountedRef = React.useRef(true)
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  React.useEffect(() => {
    const el = elRef.current
    if (!el) return
    el.textContent = defaultValue
    const id = requestAnimationFrame(() => {
      if (!mountedRef.current) return
      el.focus()
      const sel = window.getSelection()
      if (sel) {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false) // cursor no fim, sem selecionar texto
        sel.removeAllRanges()
        sel.addRange(range)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [defaultValue])

  const getText = () => elRef.current?.innerText?.trim() ?? ""

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onSave(getText() || defaultValue)
    } else if (e.key === "Escape") {
      if (elRef.current) elRef.current.textContent = defaultValue
      onCancel()
    }
  }

  const handleBlur = () => {
    const text = getText()
    if (text !== defaultValue.trim()) onSave(text)
    else onCancel()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
  }

  const base = "inline-block min-w-[2ch] border-0 bg-transparent outline-none rounded px-1.5 py-0.5 text-inherit cursor-text [&:empty]:before:content-['\u00a0']"
  const variantClass =
    variant === "code"
      ? "text-xs font-mono"
      : variant === "title"
        ? "font-medium"
        : ""

  return (
    <span
      ref={elRef}
      contentEditable={!saving}
      suppressContentEditableWarning
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={handlePaste}
      className={`${base} ${variantClass}`}
    />
  )
}

// Mesma lógica da API: extrair código, artista e título do nome do arquivo
function parseFilename(filename: string): { codigo: string; artista: string; titulo: string } {
  const nameWithoutExt = filename.replace(/\.(mp4|avi|mov|mkv)$/i, "")
  const parts = nameWithoutExt.split(" - ")
  if (parts.length >= 3) {
    return { codigo: parts[0].trim(), artista: parts[1].trim(), titulo: parts.slice(2).join(" - ").trim() }
  }
  if (parts.length === 2) {
    return { codigo: parts[0].trim(), artista: parts[1].trim(), titulo: parts[1].trim() }
  }
  return { codigo: nameWithoutExt.trim(), artista: "Desconhecido", titulo: nameWithoutExt.trim() }
}

export default function MusicasPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState<string | null>(null)
  
  const {
    data: musics = [],
    isLoading: isLoadingMusics,
  } = useMusicas({
    enabled: !!user && !!slug,
  })
  const [previewRows, setPreviewRows] = useState<PreviewMusica[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  type EditableField = "titulo" | "artista" | "codigo"
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const isMountedRef = React.useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const resolved = await Promise.resolve(params as { slug?: string } | Promise<{ slug?: string }>)
        const slugValue = resolved?.slug
        if (!cancelled && isMountedRef.current && typeof slugValue === "string") {
          setSlug(slugValue)
        }
      } catch {
        if (!cancelled && isMountedRef.current) setSlug(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [params])

  useEffect(() => {
    if (authLoading) return
    if (!isMountedRef.current) return
    if (!user) {
      navigateFast(router, "/login")
      return
    }
    if (slug && user.slug !== slug) {
      navigateFast(router, `/${user.slug}/musicas`)
      return
    }
  }, [user, slug, authLoading, router])

  // Evitar estado de edição inconsistente enquanto os dados carregam
  useEffect(() => {
    if (isLoadingMusics) {
      setEditingCell(null)
    }
  }, [isLoadingMusics])

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

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta música?")) return
    try {
      const response = await fetch(`/api/musicas/${id}`, { method: "DELETE", credentials: "include" })
      if (!response.ok) throw new Error("Erro ao deletar música")
      queryClient.setQueryData<Musica[]>(["musicas"], (old) =>
        old ? old.filter((music) => music.id !== id) : []
      )
      memoryCache.invalidatePrefix("musicas")
      queryClient.invalidateQueries({ queryKey: ["musicas"] })
    } catch (error) {
      console.error("Erro ao deletar música:", error)
      memoryCache.invalidatePrefix("musicas")
      queryClient.invalidateQueries({ queryKey: ["musicas"] })
      alert("Erro ao deletar música. Tente novamente.")
    }
  }, [queryClient])

  const saveEdit = useCallback(
    async (id: string, field: EditableField, value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const previous = queryClient.getQueryData<Musica[]>(["musicas"])
      if (!previous?.some((m) => m.id === id)) return

      // Atualização otimista imediata
      queryClient.setQueryData<Musica[]>(["musicas"], (old) =>
        old ? old.map((m) => (m.id === id ? { ...m, [field]: trimmed, updatedAt: new Date().toISOString() } : m)) : []
      )
      memoryCache.invalidatePrefix("musicas")
      setEditingCell(null)
      setSavingId(id)

      try {
        const res = await fetch(`/api/musicas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [field]: trimmed }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? "Erro ao salvar")
        }
        const { musica } = await res.json()
        queryClient.setQueryData<Musica[]>(["musicas"], (old) =>
          old ? old.map((m) => (m.id === id ? { ...m, ...musica } : m)) : []
        )
      } catch (err) {
        console.error(err)
        queryClient.setQueryData<Musica[]>(["musicas"], previous ?? [])
        memoryCache.invalidatePrefix("musicas")
        queryClient.invalidateQueries({ queryKey: ["musicas"] })
        alert(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.")
        setEditingCell({ id, field })
      } finally {
        setSavingId(null)
      }
    },
    [queryClient]
  )

  const columns = useMemo<ColumnDef<Musica>[]>(() => {
    const isEditing = (id: string, field: EditableField) =>
      editingCell?.id === id && editingCell?.field === field

    const editableCell = (row: Musica, field: EditableField, displayValue: string) => {
      const id = row.id
      const editing = isEditing(id, field)
      const saving = savingId === id
      const variant = field === "codigo" ? "code" : field === "titulo" ? "title" : "default"

      if (editing) {
        return (
          <InlineEditInput
            defaultValue={displayValue}
            saving={saving}
            variant={variant}
            onSave={(v) => saveEdit(id, field, v)}
            onCancel={() => setEditingCell(null)}
          />
        )
      }
      return (
        <button
          type="button"
          onClick={() => setEditingCell({ id, field })}
          className="text-left w-full min-w-0 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-muted/80 transition-colors"
        >
          {field === "codigo" ? (
            <code className="text-xs font-mono">{displayValue}</code>
          ) : (
            <span className={field === "titulo" ? "font-medium" : ""}>{displayValue}</span>
          )}
        </button>
      )
    }

    const baseColumns: ColumnDef<Musica>[] = [
      {
        accessorKey: "titulo",
        header: "Música",
        cell: ({ row }) => {
          const m = row.original
          return editableCell(m, "titulo", m.titulo ?? "")
        },
      },
      {
        accessorKey: "artista",
        header: "Artista",
        cell: ({ row }) => {
          const m = row.original
          return editableCell(m, "artista", m.artista ?? "")
        },
      },
      {
        accessorKey: "codigo",
        header: "Código",
        cell: ({ row }) => {
          const m = row.original
          return editableCell(m, "codigo", m.codigo ?? "")
        },
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

    baseColumns.push(
      {
        id: "tocar",
        header: "Tocar",
        cell: ({ row }) => {
          const music = row.original
          return (
            <div className="flex justify-center shrink-0 w-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(music.arquivo, "_blank")}
                title="Tocar"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
      {
        id: "deletar",
        header: "Deletar",
        cell: ({ row }) => {
          const music = row.original
          if (user?.role !== "admin") return <span className="text-muted-foreground/50">—</span>
          return (
            <div className="flex justify-center shrink-0 w-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(music.id)}
                title="Deletar"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )
        },
      }
    )

    return baseColumns
  }, [user?.role, editingCell, savingId, saveEdit])

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
    onPaginationChange: (updater) => {
      setPagination((prev) => (typeof updater === "function" ? updater(prev) : updater))
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  })

  // Voltar para primeira página quando a busca mudar (sem table nas deps para evitar loop)
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearchTerm])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setPreviewRows((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => {
        const { codigo, artista, titulo } = parseFilename(file.name)
        return { file, codigo, artista, titulo }
      }),
    ])
    setErrors({})
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv"],
    },
    multiple: true,
  })

  const updatePreviewRow = (index: number, field: keyof Omit<PreviewMusica, "file">, value: string) => {
    setPreviewRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const removePreviewRow = (index: number) => {
    setPreviewRows((prev) => prev.filter((_, i) => i !== index))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleUpload = async () => {
    if (previewRows.length === 0) return
    setUploading(true)
    setErrors({})
    let successCount = 0

    for (let i = 0; i < previewRows.length; i++) {
      const row = previewRows[i]
      const { file, codigo, artista, titulo } = row
      if (!codigo.trim()) {
        setErrors((prev) => ({ ...prev, [i]: "Código é obrigatório" }))
        continue
      }

      try {
        // 1. Pedir signed URL ao servidor (arquivo não passa pelo Next.js)
        const signRes = await fetch("/api/upload/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, codigo: codigo.trim() }),
        })
        const signData = await signRes.json()
        if (!signRes.ok) throw new Error(signData.error || "Erro ao gerar URL de upload")

        // 2. Enviar arquivo diretamente ao Supabase Storage com XHR (progresso real)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setUploadProgress((prev) => ({ ...prev, [i]: percent }))
            }
          })
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Erro ao enviar arquivo (${xhr.status})`))
            }
          })
          xhr.addEventListener("error", () => reject(new Error("Erro de rede ao fazer upload")))
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelado")))
          xhr.open("PUT", signData.signedUrl)
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4")
          xhr.send(file)
        })

        // 3. Confirmar no banco de dados
        const confirmRes = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: signData.path,
            codigo: codigo.trim(),
            artista: artista.trim(),
            titulo: titulo.trim(),
            size: file.size,
          }),
        })
        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) throw new Error(confirmData.error || "Erro ao registrar música")

        successCount++
        setUploadedFiles((prev) => new Set([...prev, i]))
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [i]: error instanceof Error ? error.message : "Erro ao fazer upload",
        }))
      }
    }

    memoryCache.invalidatePrefix("musicas")
    queryClient.invalidateQueries({ queryKey: ["musicas"] })
    await queryClient.refetchQueries({ queryKey: ["musicas"] })
    setUploading(false)
    if (successCount === previewRows.length) {
      setPreviewRows([])
      setUploadProgress({})
      setUploadedFiles(new Set())
      setDialogOpen(false)
    }
  }

  if (!user || !slug) {
    return null
  }

  const tableRows = table.getRowModel().rows

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
            <CardHeader className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle>Todas as Músicas</CardTitle>
                  <CardDescription>
                    {user.role === "admin"
                      ? "Gerencie seu catálogo de músicas de karaokê"
                      : "Explore o catálogo de músicas de karaokê"}
                  </CardDescription>
                </div>
                {user.role === "admin" && (
                  <div className="flex-shrink-0 relative z-10 pointer-events-auto">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDialogOpen(true)
                      }}
                      className="cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Músicas
                    </Button>
                  </div>
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
                    {isLoadingMusics ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Carregando músicas...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : tableRows?.length ? (
                      tableRows.map((row) => (
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
                        <TableCell colSpan={columns.length} className="h-24 text-center">
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

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setPreviewRows([])
                setErrors({})
                setUploadProgress({})
                setUploadedFiles(new Set())
              }
            }}
          >
            <DialogContent className="min-w-[1200px] max-w-[95vw] w-[95vw] min-h-[85vh] h-[85vh] max-h-[85vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <DialogTitle>Adicionar Músicas</DialogTitle>
                <DialogDescription>
                  Selecione os vídeos, confira ou edite código, artista e título na tabela e envie para salvar no catálogo.
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

                {previewRows.length > 0 && (
                  <div className="space-y-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <h3 className="text-sm font-medium">
                        {previewRows.length} arquivo(s) — edite os dados e clique em Enviar
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
                            Enviar todos
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-md border overflow-auto flex-1 min-h-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Arquivo</TableHead>
                            <TableHead className="w-[120px]">Código</TableHead>
                            <TableHead className="min-w-[140px]">Artista</TableHead>
                            <TableHead className="min-w-[180px]">Título</TableHead>
                            <TableHead className="w-[80px]">Tamanho</TableHead>
                            <TableHead className="w-[70px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRows.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs">
                                <div className="truncate max-w-[180px]" title={row.file.name}>
                                  {row.file.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.codigo}
                                  onChange={(e) => updatePreviewRow(index, "codigo", e.target.value)}
                                  placeholder="Código"
                                  className="h-8 text-sm"
                                  disabled={uploading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.artista}
                                  onChange={(e) => updatePreviewRow(index, "artista", e.target.value)}
                                  placeholder="Artista"
                                  className="h-8 text-sm"
                                  disabled={uploading}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.titulo}
                                  onChange={(e) => updatePreviewRow(index, "titulo", e.target.value)}
                                  placeholder="Título"
                                  className="h-8 text-sm"
                                  disabled={uploading}
                                />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatFileSize(row.file.size)}
                              </TableCell>
                              <TableCell>
                                {uploadProgress[index] !== undefined && (
                                  <div className="mb-1">
                                    <Progress value={uploadProgress[index]} className="h-1 w-12" />
                                  </div>
                                )}
                                {errors[index] && (
                                  <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {errors[index]}
                                  </p>
                                )}
                                {uploadedFiles.has(index) && (
                                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                    Enviado
                                  </p>
                                )}
                                {!uploading && !uploadedFiles.has(index) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => removePreviewRow(index)}
                                    title="Remover"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
