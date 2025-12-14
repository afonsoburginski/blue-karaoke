import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { createSlug } from "@/lib/slug"

interface User {
  id: string
  slug: string
  name: string
  email: string
  avatar?: string | null
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: session } = await authClient.getSession()
      
      if (session?.user) {
        const slug = createSlug(session.user.name || session.user.email.split("@")[0])
        setUser({
          id: session.user.id,
          slug,
          name: session.user.name || "",
          email: session.user.email,
          avatar: session.user.image || null,
          role: (session.user as any).role || "user",
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  return { user, isLoading, refetch: fetchUser }
}

