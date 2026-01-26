"use client"

import { Suspense } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import CadastroDesktop from "./desktop/page"
import CadastroMobile from "./mobile/page"

function CadastroContent() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <CadastroMobile />
  }

  return <CadastroDesktop />
}

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <CadastroContent />
    </Suspense>
  )
}
