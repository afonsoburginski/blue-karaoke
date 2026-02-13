import { postgresClient } from "@/lib/db"
import { isSupabaseStorageConfigured } from "@/lib/supabase-server"
import { getStorageBucketUsage } from "@/lib/supabase-storage"

export interface DashboardStats {
  totalUsuarios: number
  totalMusicas: number
  totalGb: number
  receitaMensal: number
}

export interface TopMusic {
  rank: number
  codigo: string
  titulo: string
  artista: string
  reproducoes: number
}

export interface StorageUsage {
  totalBytes: number
  totalObjects: number
  totalGb: number
}

export interface NovoUsuario {
  id: string
  name: string | null
  email: string
  slug: string | null
  role: string
  createdAt: Date
}

export interface DashboardPayload {
  stats: DashboardStats
  topMusics: TopMusic[]
  storageUsage: StorageUsage
  novosUsuarios: NovoUsuario[]
}

type CurrentUser = { userId: string; role?: string }

/** Uma única round-trip ao Postgres: stats (MV) + top_musics + novos_usuarios via RPC. */
async function fetchDashboardCoreRpc(): Promise<{
  stats: DashboardStats
  topMusics: TopMusic[]
  novosUsuarios: NovoUsuario[]
}> {
  const rows = await postgresClient`SELECT get_dashboard_core() as data`
  const raw = rows[0]?.data as {
    stats?: { totalUsuarios?: number; totalMusicas?: number; totalGb?: number; receitaMensal?: number }
    topMusics?: Array<{ rank: number; codigo: string; titulo: string; artista: string; reproducoes: number }>
    novosUsuarios?: Array<{ id: string; name: string | null; email: string; slug: string | null; role: string; createdAt: string }>
  } | null

  if (!raw) {
    return {
      stats: { totalUsuarios: 0, totalMusicas: 0, totalGb: 0, receitaMensal: 0 },
      topMusics: [],
      novosUsuarios: [],
    }
  }

  const stats: DashboardStats = {
    totalUsuarios: raw.stats?.totalUsuarios ?? 0,
    totalMusicas: raw.stats?.totalMusicas ?? 0,
    totalGb: raw.stats?.totalGb ?? 0,
    receitaMensal: raw.stats?.receitaMensal ?? 0,
  }

  const topMusics: TopMusic[] = (raw.topMusics ?? []).map((m) => ({
    rank: Number(m.rank),
    codigo: m.codigo ?? "",
    titulo: m.titulo ?? "Desconhecida",
    artista: m.artista ?? "Desconhecido",
    reproducoes: Number(m.reproducoes),
  }))

  const novosUsuarios: NovoUsuario[] = (raw.novosUsuarios ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    slug: u.slug,
    role: u.role ?? "user",
    createdAt: u.createdAt != null ? new Date(u.createdAt) : new Date(),
  }))

  return { stats, topMusics, novosUsuarios }
}

async function fetchStorageUsage(): Promise<StorageUsage> {
  if (!isSupabaseStorageConfigured()) {
    return { totalBytes: 0, totalObjects: 0, totalGb: 0 }
  }
  try {
    return await getStorageBucketUsage()
  } catch {
    return { totalBytes: 0, totalObjects: 0, totalGb: 0 }
  }
}

/**
 * Dashboard: 1 RPC (stats + top_musics + new_users) + 1 chamada Storage em paralelo.
 */
export async function getDashboardData(currentUser: CurrentUser): Promise<DashboardPayload> {
  const isAdmin = currentUser.role === "admin"

  const [core, storageUsage] = await Promise.all([
    fetchDashboardCoreRpc(),
    fetchStorageUsage(),
  ])

  return {
    stats: core.stats,
    topMusics: core.topMusics,
    storageUsage,
    novosUsuarios: isAdmin ? core.novosUsuarios : [],
  }
}
