import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { username } from "better-auth/plugins"
import { env } from "./env"

import { createSlug } from "./slug"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      usernameNormalization: (username) => username.toLowerCase().trim(),
    }),
  ],
  user: {
    modelName: "users",
    fields: {
      email: "email",
      name: "name",
      image: "image",
      emailVerified: "emailVerified",
    },
    // Hook para criar slug automaticamente
    async afterCreate(user: any) {
      const { db } = await import("./db")
      const { users } = await import("./db/schema")
      const { eq } = await import("drizzle-orm")
      
      const slug = createSlug(user.name || user.email.split("@")[0])
      
      // Atualizar usuário com slug
      await db
        .update(users)
        .set({ slug })
        .where(eq(users.id, user.id))
      
      return user
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    env.CORS_ORIGIN || "http://localhost:3000",
  ],
  secret: env.JWT_SECRET,
  baseURL: env.API_BASE_URL || "http://localhost:3000",
  basePath: "/api/auth",
})

export type Session = typeof auth.$Infer.Session

// Funções de compatibilidade com código existente
export async function getCurrentUser() {
  try {
    const { headers } = await import("next/headers")
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session?.user) {
      return null
    }

    // Retornar formato compatível
    return {
      userId: session.user.id,
      email: session.user.email,
      slug: (session.user as any).slug || (session.user.name || session.user.email.split("@")[0]).toLowerCase().replace(/\s+/g, "-"),
    }
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Better Auth gerencia isso internamente
  return password
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Better Auth gerencia isso internamente
  return false
}

export function generateToken(userId: string, email: string, slug: string): string {
  // Better Auth gerencia tokens internamente
  return ""
}

export function verifyToken(token: string): { userId: string; email: string; slug: string } | null {
  // Better Auth gerencia tokens internamente
  return null
}

export async function setAuthCookie(token: string) {
  // Better Auth gerencia cookies internamente
}

export async function removeAuthCookie() {
  // Better Auth gerencia cookies internamente
}
