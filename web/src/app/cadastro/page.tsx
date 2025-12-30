"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import CadastroDesktop from "./desktop/page"
import CadastroMobile from "./mobile/page"

export default function CadastroPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <CadastroMobile />
  }

  return <CadastroDesktop />
}
