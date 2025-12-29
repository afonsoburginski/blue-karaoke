"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase-client"

interface UseRealtimeDashboardOptions {
  userId: string
  onHistoricoChange?: () => void
  onMusicasChange?: () => void
  onUsersChange?: () => void
  onEstatisticasChange?: () => void
}

export function useRealtimeDashboard({
  userId,
  onHistoricoChange,
  onMusicasChange,
  onUsersChange,
  onEstatisticasChange,
}: UseRealtimeDashboardOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef({
    onHistoricoChange,
    onMusicasChange,
    onUsersChange,
    onEstatisticasChange,
  })

  // Atualizar referências dos callbacks sem causar re-render
  useEffect(() => {
    callbacksRef.current = {
      onHistoricoChange,
      onMusicasChange,
      onUsersChange,
      onEstatisticasChange,
    }
  }, [onHistoricoChange, onMusicasChange, onUsersChange, onEstatisticasChange])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`dashboard:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "historico",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("📡 Realtime: Histórico atualizado")
          callbacksRef.current.onHistoricoChange?.()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "musicas",
        },
        () => {
          console.log("📡 Realtime: Músicas atualizadas")
          callbacksRef.current.onMusicasChange?.()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "users",
        },
        () => {
          console.log("📡 Realtime: Novo usuário")
          callbacksRef.current.onUsersChange?.()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "estatisticas",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("📡 Realtime: Estatísticas atualizadas")
          callbacksRef.current.onEstatisticasChange?.()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
        if (status === "SUBSCRIBED" || status === "CLOSED") {
          console.log("📡 Status Realtime dashboard:", status)
        }
      })

    return () => {
      console.log("🧹 Limpando canal Realtime dashboard")
      supabase.removeChannel(channel)
    }
  }, [userId]) // Apenas userId como dependência

  return { isConnected }
}

