"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"

function PrecoRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Se tem parâmetros de checkout, redirecionar com eles para a homepage
    const planId = searchParams.get("planId")
    const checkout = searchParams.get("checkout")
    const redirect = searchParams.get("redirect")

    if (planId && checkout) {
      router.replace(`/?planId=${planId}&checkout=${checkout}`)
    } else if (planId && redirect) {
      router.replace(`/?planId=${planId}&redirect=${redirect}`)
    } else {
      router.replace("/#planos")
    }
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-neutral-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400 text-sm">Redirecionando...</p>
      </div>
    </div>
  )
}

export default function PrecoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-neutral-700 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <PrecoRedirect />
    </Suspense>
  )
}
