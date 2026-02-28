/**
 * Hook que obtém a URL do banner de fundo do app desktop.
 *
 * Fluxo:
 *  1. Carrega imediatamente o valor cacheado em localStorage (funciona offline).
 *  2. Em background, consulta o Supabase para ver se há um banner configurado.
 *  3. Se o URL remoto for diferente do cacheado, baixa a imagem, converte em
 *     data-URL e atualiza o cache — sem flash nem bloqueio.
 *  4. Repete a verificação a cada 30 minutos enquanto o app estiver aberto.
 *
 * Retorna a URL para usar como background-image (data-URL se cacheada, ou
 * URL remota, ou null para usar a imagem padrão bundled).
 */

import { useEffect, useState } from "react"

// URL da tabela pública Supabase que guarda a URL do banner atual.
// A leitura é pública (RLS: SELECT USING true), então não precisa de auth.
const SUPABASE_URL = "https://tutatgjpyzhfviabepln.supabase.co"
const CONFIG_ENDPOINT = `${SUPABASE_URL}/rest/v1/configuracoes?chave=eq.banner_url&select=valor,updated_at`
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dGF0Z2pweXpoZnZpYWJlcGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTQwMDEsImV4cCI6MjA4MjU5MDAwMX0.sJPkQfZR8rvwCQktvJr16FCoDT7a442zAG9RA9cA9hs"

const CACHE_DATA_KEY = "bk-banner-data"   // data-URL da imagem
const CACHE_SRC_KEY  = "bk-banner-src"    // URL remota que gerou o cache atual

const POLL_INTERVAL_MS = 30 * 60 * 1000   // 30 minutos

/** Converte a imagem no URL remoto para data-URL (base64) */
async function toDataUrl(remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl, { cache: "no-store" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useBannerBg(): string | null {
  // Carrega o cache imediatamente para não bloquear a renderização
  const [bgUrl, setBgUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CACHE_DATA_KEY) ?? null
    } catch {
      return null
    }
  })

  useEffect(() => {
    let cancelled = false

    async function checkAndUpdate() {
      try {
        // Consulta Supabase (leitura pública, sem necessidade de auth)
        const res = await fetch(CONFIG_ENDPOINT, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        })
        if (!res.ok || cancelled) return

        const rows: Array<{ valor: string; updated_at: string }> = await res.json()
        const remoteUrl = rows[0]?.valor?.trim() ?? ""

        if (!remoteUrl) {
          // Admin removeu o banner — limpa cache
          if (localStorage.getItem(CACHE_SRC_KEY)) {
            localStorage.removeItem(CACHE_DATA_KEY)
            localStorage.removeItem(CACHE_SRC_KEY)
            if (!cancelled) setBgUrl(null)
          }
          return
        }

        const cachedSrc = localStorage.getItem(CACHE_SRC_KEY) ?? ""
        if (remoteUrl === cachedSrc) return  // nada mudou

        // URL diferente — baixa e converte
        const dataUrl = await toDataUrl(remoteUrl)
        if (cancelled) return

        localStorage.setItem(CACHE_DATA_KEY, dataUrl)
        localStorage.setItem(CACHE_SRC_KEY, remoteUrl)
        setBgUrl(dataUrl)
      } catch {
        // Offline ou erro de rede: silencioso — usa o cache existente
      }
    }

    checkAndUpdate()
    const timer = setInterval(checkAndUpdate, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return bgUrl
}
