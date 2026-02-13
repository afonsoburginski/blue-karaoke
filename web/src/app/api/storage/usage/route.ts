import { NextResponse } from "next/server"
import { isSupabaseStorageConfigured } from "@/lib/supabase-server"
import { getStorageBucketUsage } from "@/lib/supabase-storage"

export async function GET() {
  try {
    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json({
        totalBytes: 0,
        totalObjects: 0,
        totalGb: 0,
      })
    }
    const usage = await getStorageBucketUsage()
    return NextResponse.json({
      totalBytes: usage.totalBytes,
      totalObjects: usage.totalObjects,
      totalGb: usage.totalGb,
    })
  } catch (error) {
    console.error("Erro ao buscar uso do Storage:", error)
    return NextResponse.json(
      { error: "Erro ao buscar uso do Storage" },
      { status: 500 },
    )
  }
}


