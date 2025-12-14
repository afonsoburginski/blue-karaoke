import { NextResponse } from "next/server"
import { getR2BucketUsage } from "@/lib/r2"

export async function GET() {
  try {
    const usage = await getR2BucketUsage()

    return NextResponse.json({
      totalBytes: usage.totalBytes,
      totalObjects: usage.totalObjects,
      totalGb: usage.totalGb,
    })
  } catch (error) {
    console.error("Erro ao buscar uso do R2:", error)
    return NextResponse.json(
      { error: "Erro ao buscar uso do R2" },
      { status: 500 },
    )
  }
}


