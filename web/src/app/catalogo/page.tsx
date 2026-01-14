"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import CatalogoDesktop from "./desktop/page"
import CatalogoMobile from "./mobile/page"

export default function CatalogoPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <CatalogoMobile />
  }

  return <CatalogoDesktop />
}
