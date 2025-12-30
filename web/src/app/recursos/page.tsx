"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import RecursosDesktop from "./desktop/page"
import RecursosMobile from "./mobile/page"

export default function RecursosPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <RecursosMobile />
  }

  return <RecursosDesktop />
}

