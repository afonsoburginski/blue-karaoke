"use client"

import { Monitor, Terminal, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const WINDOWS_DOWNLOAD_URL = "https://github.com/afonsoburginski/blue-karaoke/releases/download/1.0/Blue.Karaoke.Setup.1.0.0.exe"
const LINUX_DOWNLOAD_URL = "https://github.com/afonsoburginski/blue-karaoke/releases/download/1.0/blue-karaoke-1.0.0.tar.gz"

export function DownloadButtons() {
  return (
    <Card className="bg-white/75 backdrop-blur-sm shadow-xl rounded-2xl dark:bg-white/75">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-900">Baixar App</span>
        </div>
        
        <div className="flex flex-col gap-3">
          {/* Windows */}
          <a
            href={WINDOWS_DOWNLOAD_URL}
            download="Blue-Karaoke-Setup-1.0.0.exe"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0078d4] text-white shadow-md hover:bg-[#0066b3] hover:scale-105 transition-all"
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm font-medium">Windows</span>
          </a>

          {/* Linux */}
          <a
            href={LINUX_DOWNLOAD_URL}
            download="blue-karaoke-1.0.0.tar.gz"
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
