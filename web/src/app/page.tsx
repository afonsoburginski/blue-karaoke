"use client"

import { Suspense } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import HomeDesktop from "./page/desktop/page"
import HomeMobile from "./page/mobile/page"

function HomeContent() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <HomeMobile />
  }

  return <HomeDesktop />
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-neutral-700 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
