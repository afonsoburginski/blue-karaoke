"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/header/desktop"
import { 
  Music, 
  Loader2, 
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Musica {
  id: string
  codigo: string
  artista: string
  titulo: string
  duracao?: number | null
  createdAt: string
}

export default function CatalogoDesktop() {
  const [musics, setMusics] = useState<Musica[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    async function fetchMusicas() {
      try {
        setLoading(true)
        const response = await fetch("/api/catalogo")
        if (!response.ok) throw new Error("Erro ao buscar músicas")
        const data = await response.json()
        setMusics(data.musicas || [])
      } catch (error) {
        console.error("Erro ao buscar músicas:", error)
        setMusics([])
      } finally {
        setLoading(false)
      }
    }
    fetchMusicas()
  }, [])

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return "-"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const columns = useMemo<ColumnDef<Musica>[]>(() => [
    {
      accessorKey: "codigo",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent text-white hover:text-white/80"
        >
          Código
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <code className="text-sm bg-white/10 text-[#409fff] px-2 py-1 rounded font-mono">
          {row.getValue("codigo")}
        </code>
      ),
    },
    {
      accessorKey: "titulo",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent text-white hover:text-white/80"
        >
          Música
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-white">{row.getValue("titulo")}</div>
      ),
    },
    {
      accessorKey: "artista",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent text-white hover:text-white/80"
        >
          Artista
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-gray-300">{row.getValue("artista")}</div>
      ),
    },
    {
      accessorKey: "duracao",
      header: () => <span className="text-white">Duração</span>,
      cell: ({ row }) => (
        <span className="text-gray-400">{formatDuration(row.getValue("duracao"))}</span>
      ),
    },
  ], [])

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  }

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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    state: {
      sorting,
    },
  })

  useEffect(() => {
    table.setPageIndex(0)
  }, [debouncedSearchTerm, table])

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-8 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Catálogo de Músicas
          </h1>
          <p className="text-lg text-gray-300">
            Explore nosso catálogo com mais de {musics.length.toLocaleString('pt-BR')} músicas de karaokê
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="px-6 md:px-12 lg:px-20 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por código, título ou artista..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-12 h-14 text-lg rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#409fff]"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setSearchTerm("")}
              >
                Limpar
              </Button>
            )}
          </div>
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            {debouncedSearchTerm && (
              <div className="text-[#409fff] font-medium">
                {filteredData.length.toLocaleString('pt-BR')} resultado(s)
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#409fff]" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-white/10 hover:bg-transparent">
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} className="text-gray-400">
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
                            className="border-white/10 hover:bg-white/5 transition-colors"
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
                            className="h-40 text-center"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5">
                                <Music className="h-8 w-8 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-white">Nenhuma música encontrada</p>
                                <p className="text-sm text-gray-400">
                                  Tente buscar por outro termo
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Mostrando {table.getRowModel().rows.length} de {filteredData.length} músicas
                    {table.getPageCount() > 1 && (
                      <span className="ml-1">
                        (página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()})
                      </span>
                    )}
                  </div>
                  {table.getPageCount() > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <div className="hidden md:flex items-center gap-1">
                        {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                          const pageIndex = table.getState().pagination.pageIndex
                          const totalPages = table.getPageCount()
                          let page: number
                          
                          if (totalPages <= 5) {
                            page = i
                          } else if (pageIndex < 3) {
                            page = i
                          } else if (pageIndex > totalPages - 4) {
                            page = totalPages - 5 + i
                          } else {
                            page = pageIndex - 2 + i
                          }

                          return (
                            <Button
                              key={page}
                              variant={page === pageIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => table.setPageIndex(page)}
                              className={page === pageIndex 
                                ? "bg-[#409fff] hover:bg-[#3090f0] text-white w-9" 
                                : "border-white/20 text-white hover:bg-white/10 w-9"
                              }
                            >
                              {page + 1}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[#409fff]/20 to-[#3090f0]/20 border border-[#409fff]/30 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Quer cantar essas músicas?
            </h2>
            <p className="text-gray-300 mb-8">
              Cadastre-se e tenha acesso ao nosso catálogo completo de karaokê!
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/cadastro">
                <Button size="lg" className="bg-[#409fff] hover:bg-[#3090f0] text-white px-8">
                  Começar Agora
                </Button>
              </Link>
              <Link href="/preco">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
                  Ver Planos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
