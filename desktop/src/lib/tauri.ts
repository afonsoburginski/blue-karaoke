import { invoke } from "@tauri-apps/api/core"

// Types
export interface MusicaSimple {
  codigo: string
  artista: string
  titulo: string
  arquivo: string
}

export interface AtivacaoStatus {
  ativada: boolean
  expirada: boolean
  modo: string
  chave: string | null
  /** "maquina" | "assinatura" - no modo máquina o input de busca fica numérico */
  tipo: string
  diasRestantes: number | null
  horasRestantes: number | null
}

export interface ValidacaoResult {
  valida: boolean
  error: string | null
  chave: {
    tipo: string
    diasRestantes: number | null
    horasRestantes: number | null
  } | null
}

export interface OfflineStatus {
  totalMusicas: number
  musicasOffline: number
  musicasOnline: number
  storageUsed: number
  storageUsedMB: number
}

export interface DownloadResult {
  downloaded: number
  remaining: number
  errors: string[]
}

export interface ReindexResult {
  total: number
  reindexed: number
  errors: string[]
}

// Commands
export async function buscarMusicas(query: string): Promise<MusicaSimple[]> {
  return invoke("buscar_musicas", { query })
}

export async function getMusicaByCodigo(codigo: string): Promise<MusicaSimple | null> {
  return invoke("get_musica_by_codigo", { codigo })
}

export async function musicaAleatoria(): Promise<string | null> {
  return invoke("musica_aleatoria")
}

export async function getAllMusicasCount(): Promise<number> {
  return invoke("get_all_musicas_count")
}

export async function salvarHistorico(codigo: string): Promise<void> {
  return invoke("salvar_historico", { codigo })
}

export async function verificarAtivacao(): Promise<AtivacaoStatus> {
  return invoke("verificar_ativacao")
}

export async function validarChave(chave: string): Promise<ValidacaoResult> {
  return invoke("validar_chave", { chave })
}

export async function removerAtivacao(): Promise<void> {
  return invoke("remover_ativacao")
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  return invoke("get_offline_status")
}

export async function downloadBatch(size?: number): Promise<DownloadResult> {
  return invoke("download_batch", { size: size ?? 3 })
}

export async function reindexMusicas(): Promise<ReindexResult> {
  return invoke("reindex_musicas")
}

export async function getVideoPath(codigo: string): Promise<string> {
  return invoke("get_video_path", { codigo })
}
