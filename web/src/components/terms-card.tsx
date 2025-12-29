"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic } from "lucide-react"

const CONSENT_COOKIE_NAME = "terms-consent"
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 ano

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

export function TermsCard() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Verificar se o usuário já aceitou os termos
    const consent = getCookie(CONSENT_COOKIE_NAME)
    if (consent === "accepted") {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    // Salvar consentimento em cookie
    setCookie(CONSENT_COOKIE_NAME, "accepted", CONSENT_COOKIE_MAX_AGE)
    
    // Salvar também no localStorage para referência rápida
    if (typeof window !== "undefined") {
      localStorage.setItem("termsAccepted", "true")
      localStorage.setItem("termsAcceptedDate", new Date().toISOString())
    }

    // Ocultar o card
    setIsVisible(false)

    // Opcional: redirecionar ou recarregar a página
    // router.refresh()
  }

  if (!isVisible) {
    return null
  }

  return (
    <Card className="w-full max-w-xs bg-white shadow-xl rounded-2xl">
      <CardContent className="p-6">
        {/* Logo */}
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white">
          <Mic className="h-6 w-6" />
        </div>

        {/* Title */}
        <h1 className="mb-6 text-2xl font-normal text-foreground">
          Está <em className="font-serif italic">quase</em> lá
        </h1>

        {/* Description */}
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          Para continuar, aceite nossos{" "}
          <a href="#" className="text-foreground underline hover:no-underline">
            Termos de Serviço
          </a>
          , e declare estar ciente da nossa{" "}
          <a href="#" className="text-foreground underline hover:no-underline">
            Política de Privacidade
          </a>
          .
        </p>

        {/* Button */}
        <Button 
          onClick={handleAccept}
          className="w-full bg-[#409fff] hover:bg-[#3090f0] text-white py-6 rounded-xl text-base font-medium"
        >
          Concordo
        </Button>
      </CardContent>
    </Card>
  )
}
