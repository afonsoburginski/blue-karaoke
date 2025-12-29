"use client"

import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"
import { useMemo, useState, useEffect } from "react"

interface User {
  id: string
  slug: string
  name: string
  email: string
  avatar?: string | null
  role: string
}

export function useAuth() {
  // Usar useSession do Better Auth que gerencia cookies automaticamente
  const {
    data: session,
    isPending: sessionLoading,
    error,
  } = authClient.useSession()

  const [userRole, setUserRole] = useState<string | null>(null)
  const [userSlug, setUserSlug] = useState<string | null>(null)
  const [isLoadingRole, setIsLoadingRole] = useState(false)

  // Buscar role e slug do banco se não estiverem na sessão
  useEffect(() => {
    if (!session?.user || sessionLoading) {
      setUserRole(null)
      setUserSlug(null)
      return
    }

    const sessionUser = session.user as any
    
    // Se já tiver role e slug na sessão, usar
    if (sessionUser.role && sessionUser.slug) {
      setUserRole(sessionUser.role)
      setUserSlug(sessionUser.slug)
      return
    }

    // Buscar do servidor
    const fetchRoleAndSlug = async () => {
      if (isLoadingRole) return
      
      setIsLoadingRole(true)
      try {
        const response = await fetch("/api/auth/get-session-with-role", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          if (data?.session?.user) {
            setUserRole(data.session.user.role || "user")
            setUserSlug(data.session.user.slug || null)
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar role e slug:", error)
      } finally {
        setIsLoadingRole(false)
      }
    }

    fetchRoleAndSlug()
  }, [session?.user?.id, sessionLoading])

  // Transformar a sessão do Better Auth no formato User
  const user = useMemo<User | null>(() => {
    if (!session?.user) {
      return null
    }

    const sessionUser = session.user as any
    
    // Usar role e slug da sessão ou do estado (busca do servidor)
    const finalSlug = sessionUser.slug || userSlug || createSlug(session.user.name || session.user.email.split("@")[0])
    const finalRole = sessionUser.role || userRole || "user"

    return {
      id: session.user.id,
      slug: finalSlug,
      name: session.user.name || "",
      email: session.user.email,
      avatar: session.user.image || null,
      role: finalRole,
    }
  }, [session, userRole, userSlug])

  const isLoading = sessionLoading || isLoadingRole

  const refetch = async () => {
    // useSession já é reativo, mas podemos forçar refetch se necessário
    await authClient.getSession()
    setUserRole(null)
    setUserSlug(null)
  }

  return { user, isLoading, refetch }
}

