import { NextResponse } from "next/server"

const GITHUB_REPO = "afonsoburginski/blue-karaoke"
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`

export type ReleaseAssets = {
  version: string
  windowsUrl: string | null
  windowsFilename: string | null
  linuxUrl: string | null
  linuxFilename: string | null
}

export type LatestRelease = ReleaseAssets

export type ReleasesResponse = {
  releases: ReleaseAssets[]
}

function parseRelease(data: {
  tag_name: string
  assets: Array<{ name: string; browser_download_url: string }>
}): ReleaseAssets {
  const version = data.tag_name.replace(/^v/, "")
  const assets = data.assets ?? []

  const exe = assets.find((a) => a.name.toLowerCase().endsWith(".exe"))
  const deb = assets.find((a) => a.name.toLowerCase().endsWith(".deb"))
  const tarGz = assets.find((a) =>
    a.name.toLowerCase().endsWith(".tar.gz")
  )
  const linuxAsset = deb ?? tarGz

  return {
    version,
    windowsUrl: exe?.browser_download_url ?? null,
    windowsFilename: exe?.name ?? null,
    linuxUrl: linuxAsset?.browser_download_url ?? null,
    linuxFilename: linuxAsset?.name ?? null,
  }
}

export async function GET() {
  try {
    const res = await fetch(`${GITHUB_API}?per_page=1`, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "Release não encontrada", releases: [] },
        { status: 404 }
      )
    }

    const data = (await res.json()) as Array<{
      tag_name: string
      assets: Array<{ name: string; browser_download_url: string }>
    }>

    const releases = data.map(parseRelease)

    // Backward compatibility: include top-level fields from the latest release
    const latest = releases[0] ?? {
      version: "1.0",
      windowsUrl: null,
      windowsFilename: null,
      linuxUrl: null,
      linuxFilename: null,
    }

    return NextResponse.json({
      ...latest,
      releases,
    })
  } catch (err) {
    console.error("latest-release:", err)
    return NextResponse.json(
      { error: "Erro ao buscar release", releases: [] },
      { status: 500 }
    )
  }
}
