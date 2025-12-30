"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import PrecoDesktop from "./desktop/page"
import PrecoMobile from "./mobile/page"

export default function PrecoPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <PrecoMobile />
  }

  return <PrecoDesktop />
}

