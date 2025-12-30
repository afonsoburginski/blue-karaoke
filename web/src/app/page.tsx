"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import HomeDesktop from "./page/desktop/page"
import HomeMobile from "./page/mobile/page"

export default function Home() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <HomeMobile />
  }

  return <HomeDesktop />
}
