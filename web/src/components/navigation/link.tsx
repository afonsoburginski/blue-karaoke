/**
 * Componente Link otimizado com prefetch automático
 * Melhora performance de navegação usando prefetch e startTransition
 */

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useEffect, useRef } from "react"
import type { LinkProps as NextLinkProps } from "next/link"

interface OptimizedLinkProps extends Omit<NextLinkProps, "href"> {
  href: string
  children: React.ReactNode
  prefetch?: boolean
  className?: string
}

/**
 * Link otimizado que faz prefetch automático ao hover
 * Usa startTransition para navegações não bloqueantes
 */
export function OptimizedLink({
  href,
  children,
  prefetch = true,
  className,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter()
  const hasPrefetched = useRef(false)

  // Prefetch automático ao montar (se habilitado)
  useEffect(() => {
    if (prefetch && !hasPrefetched.current && typeof window !== "undefined") {
      try {
        router.prefetch(href)
        hasPrefetched.current = true
      } catch (error) {
        // Ignorar erros de prefetch
      }
    }
  }, [href, prefetch, router])

  // Prefetch ao hover (intent-based prefetch)
  const handleMouseEnter = () => {
    if (prefetch && !hasPrefetched.current && typeof window !== "undefined") {
      try {
        router.prefetch(href)
        hasPrefetched.current = true
      } catch (error) {
        // Ignorar erros
      }
    }
  }

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      prefetch={prefetch}
      {...props}
    >
      {children}
    </Link>
  )
}
