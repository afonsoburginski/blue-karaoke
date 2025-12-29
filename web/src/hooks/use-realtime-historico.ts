"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase-client"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface HistoricoEntry {
  id: string
  userId: string
  musicaId: string
  codigo: string
  dataExecucao: string
  musica?: {
    id: string
    titulo: string
    artista: string
    duracao: number | null
  }
}

interface UseRealtimeHistoricoOptions {
  userId: string
  onInsert?: (entry: HistoricoEntry) => void
  onUpdate?: (entry: HistoricoEntry) => void
  onDelete?: (entry: { id: string }) => void
}

export function useRealtimeHistorico({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeHistoricoOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const callbacksRef = useRef({
    onInsert,
    onUpdate,
    onDelete,
  })

  // Atualizar referências dos callbacks sem causar re-render
  useEffect(() => {
    callbacksRef.current = {
      onInsert,
      onUpdate,
      onDelete,
    }
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`historico:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "historico",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("📡 Realtime histórico:", payload)

          if (payload.eventType === "INSERT" && callbacksRef.current.onInsert) {
            callbacksRef.current.onInsert(payload.new as HistoricoEntry)
          } else if (payload.eventType === "UPDATE" && callbacksRef.current.onUpdate) {
            callbacksRef.current.onUpdate(payload.new as HistoricoEntry)
          } else if (payload.eventType === "DELETE" && callbacksRef.current.onDelete) {
            callbacksRef.current.onDelete({ id: payload.old.id })
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
        if (status === "SUBSCRIBED" || status === "CLOSED") {
          console.log("📡 Status Realtime histórico:", status)
        }
      })

    return () => {
      console.log("🧹 Limpando canal Realtime histórico")
      supabase.removeChannel(channel)
    }
  }, [userId]) // Apenas userId como dependência

  return { isConnected }
}

