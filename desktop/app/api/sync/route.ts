import { NextRequest, NextResponse } from "next/server"
import { syncAll } from "@/lib/sync"
import { 
  downloadMusicasMetadata, 
  downloadAllMusicas, 
  downloadMusicasBatch,
  getOfflineStatus 
} from "@/lib/sync-download"
import { ensureLocalDbInitialized } from "@/lib/db/auto-init"

export const runtime = "nodejs"

/**
 * API route para sincronização offline
 * 
 * POST /api/sync - Sincroniza dados (upload local -> Supabase)
 * GET /api/sync - Retorna status da sincronização
 * POST /api/sync?action=download - Baixa músicas para offline
 * POST /api/sync?action=download-metadata - Baixa apenas metadados
 */

export async function POST(request: NextRequest) {
  try {
    await ensureLocalDbInitialized()
    
    const action = request.nextUrl.searchParams.get("action")
    
    // Download de músicas para offline
    if (action === "download") {
      const result = await downloadAllMusicas()
      
      return NextResponse.json({
        success: true,
        action: "download",
        metadataDownloaded: result.metadataDownloaded,
        filesDownloaded: result.filesDownloaded,
        errors: result.errors,
      })
    }
    
    // Download apenas de metadados
    if (action === "download-metadata") {
      const result = await downloadMusicasMetadata()
      
      return NextResponse.json({
        success: true,
        action: "download-metadata",
        downloaded: result.downloaded,
        errors: result.errors,
      })
    }
    
    // Download em lote (background)
    if (action === "download-batch") {
      const batchSize = parseInt(request.nextUrl.searchParams.get("size") || "3", 10)
      const result = await downloadMusicasBatch(batchSize)
      
      return NextResponse.json({
        success: true,
        action: "download-batch",
        downloaded: result.downloaded,
        remaining: result.remaining,
        errors: result.errors,
      })
    }
    
    // Sincronização padrão (upload local -> Supabase)
    const result = await syncAll()
    
    return NextResponse.json({
      success: true,
      action: "sync",
      synced: result.synced,
      historico: result.historico,
      musicas: result.musicas,
      errors: result.errors,
    })
  } catch (error: any) {
    console.error("Erro na sincronização:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao sincronizar dados",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sync - Retorna status da sincronização offline
 */
export async function GET() {
  try {
    await ensureLocalDbInitialized()
    
    const status = await getOfflineStatus()
    
    return NextResponse.json({
      success: true,
      status: "ready",
      offline: {
        totalMusicas: status.totalMusicas,
        musicasOffline: status.musicasOffline,
        musicasOnline: status.musicasOnline,
        storageUsed: status.storageUsed,
        storageUsedMB: Math.round(status.storageUsed / 1024 / 1024 * 100) / 100,
      },
    })
  } catch (error: any) {
    console.error("Erro ao verificar status de sync:", error)
    return NextResponse.json({
      success: true,
      status: "initializing",
      offline: {
        totalMusicas: 0,
        musicasOffline: 0,
        musicasOnline: 0,
        storageUsed: 0,
        storageUsedMB: 0,
      },
    })
  }
}
