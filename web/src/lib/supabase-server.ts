import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase com service role para uso em API routes (upload, delete, etc.).
 * Não expor no client — usar apenas no servidor.
 *
 * Requer no .env (ou .env.local) na pasta web/:
 * - NEXT_PUBLIC_SUPABASE_URL (ex.: https://xxx.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY (chave "service_role" em Supabase → Settings → API)
 */
export function isSupabaseStorageConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return Boolean(url && key)
}

export function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url) {
    throw new Error("Supabase Storage: falta NEXT_PUBLIC_SUPABASE_URL no .env (pasta web/)")
  }
  if (!key) {
    throw new Error(
      "Supabase Storage: SUPABASE_SERVICE_ROLE_KEY não encontrada. Adicione no arquivo web/.env (não na raiz do repo). Dashboard → Settings → API → service_role. Reinicie o servidor."
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
