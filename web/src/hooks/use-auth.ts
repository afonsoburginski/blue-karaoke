"use client"

import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"
import { useMemo, useState, useEffect, useRef, useCallback } from "react"

// Cache local para role e slug (persistir entre recarregamentos)
const CACHE_KEY = "blue-karaoke-user-role-cache"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

interface RoleCache {
  userId: string
  role: string
  slug: string
  timestamp: number
}

function getCachedRole(userId: string): { role: string; slug: string } | null {
  if (typeof window === "undefined") return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const data: RoleCache = JSON.parse(cached)
    
    // Verificar se é do mesmo usuário e ainda válido
    if (data.userId === userId && Date.now() - data.timestamp < CACHE_DURATION) {
      return { role: data.role, slug: data.slug }
    }
    
    // Cache expirado ou de outro usuário
    localStorage.removeItem(CACHE_KEY)
    return null
  } catch {
    return null
  }
}

function setCachedRole(userId: string, role: string, slug: string) {
  if (typeof window === "undefined") return
  
  try {
    const cache: RoleCache = {
      userId,
      role,
      slug,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignorar erros de localStorage
  }
}

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
  const hasFetchedRole = useRef(false)

  // Função para buscar role e slug do servidor (usar useCallback para evitar recriações)
  const fetchRoleAndSlug = useCallback(async (userId: string, background = false) => {
    if (!background) {
      setIsLoadingRole(true)
    }
    hasFetchedRole.current = true
    
    try {
      const response = await fetch("/api/auth/get-session-with-role", {
        credentials: "include",
        // Adicionar cache header para evitar requisições desnecessárias
        headers: {
          "Cache-Control": "max-age=300", // 5 minutos
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data?.session?.user) {
          const role = data.session.user.role || "user"
          const slug = data.session.user.slug || null
          setUserRole(role)
          setUserSlug(slug)
          setCachedRole(userId, role, slug || "")
        }
      }
    } catch (error) {
      console.warn("Erro ao buscar role e slug:", error)
      if (!background) {
        hasFetchedRole.current = false // Permitir retry em caso de erro (só se não for background)
      }
    } finally {
      if (!background) {
        setIsLoadingRole(false)
      }
    }
  }, [])

  // Buscar role e slug do banco se não estiverem na sessão
  useEffect(() => {
    // Se ainda está carregando a sessão, não fazer nada
    if (sessionLoading) {
      return
    }

    // Se não tem sessão, limpar estados e cache
    if (!session?.user) {
      setUserRole(null)
      setUserSlug(null)
      hasFetchedRole.current = false
      if (typeof window !== "undefined") {
        localStorage.removeItem(CACHE_KEY)
      }
      return
    }

    const sessionUser = session.user as any
    const userId = session.user.id
    
    // 1. Se já tiver role e slug na sessão (Better Auth incluiu via additionalFields), usar diretamente
    if (sessionUser.role && sessionUser.slug) {
      setUserRole(sessionUser.role)
      setUserSlug(sessionUser.slug)
      setCachedRole(userId, sessionUser.role, sessionUser.slug)
      hasFetchedRole.current = true
      return
    }

    // 2. Verificar cache local antes de buscar do servidor
    const cached = getCachedRole(userId)
    if (cached) {
      setUserRole(cached.role)
      setUserSlug(cached.slug)
      hasFetchedRole.current = true
      // Buscar em background para atualizar cache apenas se cache estiver expirando (não bloquear UI)
      const cacheAge = Date.now() - (JSON.parse(localStorage.getItem(CACHE_KEY) || "{}").timestamp || 0)
      if (cacheAge > CACHE_DURATION * 0.8) {
        // Cache está próximo de expirar, atualizar em background
        fetchRoleAndSlug(userId, true)
      }
      return
    }

    // 3. Buscar do servidor apenas se realmente precisar (só uma vez por sessão)
    if (hasFetchedRole.current || isLoadingRole) {
      return
    }

    fetchRoleAndSlug(userId, false)
  }, [session?.user?.id, sessionLoading, fetchRoleAndSlug, isLoadingRole])

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

  // Só mostrar loading se realmente não temos dados ainda
  // Se já temos user mas está carregando role, não bloquear a UI
  const isLoading = sessionLoading && !session?.user
  
  // Verificar se o role ainda está sendo carregado
  // Se temos user mas role é "user" (default) e ainda não buscamos, pode estar carregando
  // Ou se está atualmente buscando o role
  const isRoleLoading = 
    (session?.user && !sessionLoading && userRole === null && !hasFetchedRole.current) ||
    isLoadingRole

  const refetch = async () => {
    // useSession já é reativo, mas podemos forçar refetch se necessário
    await authClient.getSession()
    setUserRole(null)
    setUserSlug(null)
    hasFetchedRole.current = false
    // Limpar cache ao refetch
    if (typeof window !== "undefined") {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  return { user, isLoading, isRoleLoading, refetch }
}

