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
  /** Se true (ex.: admin), escuta todos os inserts/updates/deletes da tabela histórico, não só do userId */
  subscribeAll?: boolean
  onInsert?: (entry: HistoricoEntry) => void
  onUpdate?: (entry: HistoricoEntry) => void
  onDelete?: (entry: { id: string }) => void
}

export function useRealtimeHistorico({
  userId,
  subscribeAll = false,
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
    if (!userId && !subscribeAll) return

    const channelName = subscribeAll ? "historico:all" : `historico:${userId}`
    const opts: { event: string; schema: string; table: string; filter?: string } = {
      event: "*",
      schema: "public",
      table: "historico",
    }
    if (!subscribeAll && userId) {
      opts.filter = `user_id=eq.${userId}`
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        opts,
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
  }, [userId, subscribeAll])

  return { isConnected }
}

