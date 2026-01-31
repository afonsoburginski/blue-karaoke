"use client"

import { useEffect, useState } from "react"
import { Monitor, Terminal, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type LatestRelease = {
  version: string
  windowsUrl: string | null
  windowsFilename: string | null
  linuxUrl: string | null
  linuxFilename: string | null
}

const FALLBACK: LatestRelease = {
  version: "1.0",
  windowsUrl: "https://github.com/afonsoburginski/blue-karaoke/releases/download/1.0/Blue.Karaoke.Setup.1.0.0.exe",
  windowsFilename: "Blue-Karaoke-Setup-1.0.0.exe",
  linuxUrl: "https://github.com/afonsoburginski/blue-karaoke/releases/download/1.0/blue-karaoke-1.0.0.tar.gz",
  linuxFilename: "blue-karaoke-1.0.0.tar.gz",
}

export function DownloadButtons() {
  const [release, setRelease] = useState<LatestRelease | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/latest-release")
      .then((r) => r.ok ? r.json() : null)
      .then((data: LatestRelease | null) => {
        if (data?.version && (data.windowsUrl || data.linuxUrl)) {
          setRelease(data)
        } else {
          setRelease(FALLBACK)
        }
      })
      .catch(() => setRelease(FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  const r = release ?? FALLBACK
  const windowsHref = r.windowsUrl ?? FALLBACK.windowsUrl
  const linuxHref = r.linuxUrl ?? FALLBACK.linuxUrl

  return (
    <Card className="bg-white/75 backdrop-blur-sm shadow-xl rounded-2xl dark:bg-white/75">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-900">
            Baixar App {!loading && r.version && (
              <span className="text-gray-500 font-normal">(v{r.version})</span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Windows */}
          <a
            href={windowsHref}
            download={r.windowsFilename ?? undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0078d4] text-white shadow-md hover:bg-[#0066b3] hover:scale-105 transition-all"
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm font-medium">Windows</span>
          </a>

          {/* Linux */}
          <a
            href={linuxHref}
            download={r.linuxFilename ?? undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#fcc624] text-gray-900 shadow-md hover:bg-[#e6b320] hover:scale-105 transition-all"
          >
            <Terminal className="h-5 w-5" />
            <span className="text-sm font-medium">Linux</span>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
