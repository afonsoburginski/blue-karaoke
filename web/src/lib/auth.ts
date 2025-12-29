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
    // Hook após login para garantir que role e slug estejam disponíveis
    async afterSignIn({ user }) {
      // Buscar dados completos do usuário do banco
      const { db, users } = await import("./db")
      const { eq } = await import("drizzle-orm")
      
      const [fullUser] = await db
        .select({
          role: users.role,
          slug: users.slug,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
      
      if (fullUser) {
        // Adicionar role e slug ao objeto user retornado
        return {
          ...user,
          role: fullUser.role,
          slug: fullUser.slug,
        }
      }
      
      return user
    },
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
      slug: "slug", // Adicionar slug aos campos do usuário
      role: "role", // Adicionar role aos campos do usuário
      // password não está em users - Better Auth armazena na tabela 'account'
    },
    // Hook para criar slug automaticamente após criação
    async afterCreate(user: any) {
      const { db } = await import("./db")
      const { users } = await import("./db/schema")
      const { eq } = await import("drizzle-orm")
      
      // Gerar slug baseado no nome ou email
      const slug = createSlug(user.name || user.email.split("@")[0])
      
      // Atualizar usuário com slug
      await db
        .update(users)
        .set({ slug })
        .where(eq(users.id, user.id))
      
      return { ...user, slug }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutos
    },
  },
  trustedOrigins: [
    // Origem configurada manualmente
    env.CORS_ORIGIN || "http://localhost:3000",
    // Domínios de produção
    "https://www.bluekaraokes.com.br",
    "https://bluekaraokes.com.br",
    // Localhost para desenvolvimento
    "http://localhost:3000",
    // Vercel preview deployments
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    // Next.js public URL se disponível
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ].filter(Boolean) as string[],
  secret: env.JWT_SECRET,
  baseURL: env.CORS_ORIGIN || 
    process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
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
