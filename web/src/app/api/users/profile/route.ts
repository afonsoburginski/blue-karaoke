import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { account } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, newPassword, avatar } = body

    // Buscar usuário atual
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    const updateData: {
      name?: string
      email?: string
      avatar?: string
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    // Atualizar nome
    if (name) {
      updateData.name = name
    }

    // Atualizar email (verificar se já existe)
    if (email && email !== user.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: "Email já está em uso" },
          { status: 400 }
        )
      }

      updateData.email = email
    }

    // Atualizar senha na tabela account (Better Auth)
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres" },
          { status: 400 }
        )
      }

      // Buscar conta do usuário
      const [userAccount] = await db
        .select()
        .from(account)
        .where(eq(account.userId, currentUser.userId))
        .limit(1)

      if (userAccount) {
        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        
        // Atualizar senha na tabela account
        await db
          .update(account)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(account.id, userAccount.id))
      }
    }

    // Atualizar avatar
    if (avatar !== undefined) {
      updateData.avatar = avatar
    }

    // Atualizar usuário
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.userId))
      .returning()

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        slug: updatedUser.slug,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    )
  }
}

