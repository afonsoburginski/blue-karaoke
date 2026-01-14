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
import { Header } from "@/components/header/mobile"
import { 
  Music, 
  Loader2, 
  Search,
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

export default function CatalogoMobile() {
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
      header: () => <span className="text-white text-xs">Cód.</span>,
      cell: ({ row }) => (
        <code className="text-xs bg-white/10 text-[#409fff] px-1.5 py-0.5 rounded font-mono">
          {row.getValue("codigo")}
        </code>
      ),
    },
    {
      accessorKey: "titulo",
      header: () => <span className="text-white text-xs">Música</span>,
      cell: ({ row }) => (
        <div className="text-xs text-white truncate max-w-[120px]">{row.getValue("titulo")}</div>
      ),
    },
    {
      accessorKey: "artista",
      header: () => <span className="text-white text-xs">Artista</span>,
      cell: ({ row }) => (
        <div className="text-xs text-gray-300 truncate max-w-[100px]">{row.getValue("artista")}</div>
      ),
    },
    {
      accessorKey: "duracao",
      header: () => <span className="text-white text-xs">Dur.</span>,
      cell: ({ row }) => (
        <span className="text-xs text-gray-400">{formatDuration(row.getValue("duracao"))}</span>
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
        pageSize: 30,
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
      <section className="relative pt-20 pb-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Catálogo de Músicas
          </h1>
          <p className="text-sm text-gray-300">
            {musics.length.toLocaleString('pt-BR')} músicas disponíveis
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10 h-11 text-sm rounded-lg bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#409fff]"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white h-8 text-xs"
              onClick={() => setSearchTerm("")}
            >
              Limpar
            </Button>
          )}
        </div>
        {debouncedSearchTerm && (
          <p className="text-xs text-[#409fff] mt-2 text-center">
            {filteredData.length} resultado(s)
          </p>
        )}
      </section>

      {/* Table Section */}
      <section className="px-4 pb-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#409fff]" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-white/10 hover:bg-transparent">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="text-gray-400 px-2 py-2">
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
                          className="border-white/10 hover:bg-white/5"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-2 py-2">
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
                          className="h-32 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Music className="h-8 w-8 text-gray-500" />
                            <p className="text-sm text-white">Nenhuma música</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-3 py-3 border-t border-white/10">
                <div className="text-xs text-gray-400">
                  {table.getRowModel().rows.length}/{filteredData.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="text-white disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-400">
                    {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="text-white disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-8">
        <div className="bg-gradient-to-r from-[#409fff]/20 to-[#3090f0]/20 border border-[#409fff]/30 rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">
            Quer cantar?
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Cadastre-se e acesse o catálogo completo!
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/cadastro" className="w-full">
              <Button className="w-full bg-[#409fff] hover:bg-[#3090f0] text-white">
                Começar Agora
              </Button>
            </Link>
            <Link href="/preco" className="w-full">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Ver Planos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
