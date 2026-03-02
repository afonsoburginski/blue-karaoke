import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { username } from "better-auth/plugins"
import { env } from "./env"
import bcrypt from "bcryptjs"

import { createSlug } from "./slug"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    // Configurar bcrypt para compatibilidade com senhas existentes
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 10)
      },
      verify: async (data: { password: string; hash: string }) => {
        // Validar que temos ambos os parâmetros
        if (!data.password || !data.hash || typeof data.hash !== 'string') {
          return false
        }
        try {
          return await bcrypt.compare(data.password, data.hash)
        } catch (error) {
          console.error("Erro ao verificar senha:", error)
          return false
        }
      },
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
      // slug e role estão em additionalFields abaixo
      // password não está em users - Better Auth armazena na tabela 'account'
    },
    // Incluir role e slug na sessão automaticamente
    additionalFields: {
      role: {
        type: "string",
        input: false, // Não permitir que usuários definam role durante registro
      },
      slug: {
        type: "string",
        input: false, // Não permitir que usuários definam slug durante registro
      },
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
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // Atualizar sessão a cada 24 horas
    // cookieCache DESATIVADO: armazenar a sessão serializada no cookie
    // causava cookies de 3-5 KB, ultrapassando o limite de headers do Node.js (431).
    cookieCache: {
      enabled: false,
    },
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    },
  },
  trustedOrigins: [
    // Origem configurada manualmente
    env.CORS_ORIGIN || "http://localhost:3000",
    // Domínios de produção
    "https://www.bluekaraokes.com.br",
    "https://bluekaraokes.com.br",
    // Localhost para desenvolvimento (múltiplas portas)
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
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

/** Retorna o usuário atual (API routes e server). Better Auth usa cookie cache (5 min). */
export async function getCurrentUser() {
  try {
    const { headers } = await import("next/headers")
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return null

    const user = session.user as { id: string; email: string; name?: string; slug?: string; role?: string }
    return {
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      slug: user.slug || (user.name || user.email?.split("@")[0] || "").toLowerCase().replace(/\s+/g, "-"),
      role: user.role ?? "user",
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
