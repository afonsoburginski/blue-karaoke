import { NextRequest, NextResponse } from "next/server"
import { db, users } from "@/lib/db"
import { getCurrentUser, hashPassword, comparePassword } from "@/lib/auth"
import { eq } from "drizzle-orm"

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
    const { name, email, currentPassword, newPassword, avatar } = body

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
      password?: string
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

    // Atualizar senha
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória para alterar a senha" },
          { status: 400 }
        )
      }

      const isPasswordValid = await comparePassword(currentPassword, user.password)

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres" },
          { status: 400 }
        )
      }

      updateData.password = await hashPassword(newPassword)
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

