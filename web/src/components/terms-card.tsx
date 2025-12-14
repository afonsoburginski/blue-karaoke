"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function TermsCard() {
  return (
    <Card className="w-full max-w-xs bg-white shadow-xl rounded-2xl">
      <CardContent className="p-6">
        {/* Logo */}
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white text-lg font-bold">
          BLUE KARAOKÊS
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
        <Button className="w-full bg-[#409fff] hover:bg-[#3090f0] text-white py-6 rounded-xl text-base font-medium">
          Concordo
        </Button>
      </CardContent>
    </Card>
  )
}
