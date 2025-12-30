"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import LoginDesktop from "./desktop/page"
import LoginMobile from "./mobile/page"

export default function LoginPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <LoginMobile />
  }

  return <LoginDesktop />
}

