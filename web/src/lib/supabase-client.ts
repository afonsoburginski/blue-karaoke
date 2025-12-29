"use client"

import { createClient } from "@supabase/supabase-js"

// Obter URL e anon key do Supabase
// Essas variáveis devem estar no .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tutatgjpyzhfviabepln.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dGF0Z2pweXpoZnZpYWJlcGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTQwMDEsImV4cCI6MjA4MjU5MDAwMX0.sJPkQfZR8rvwCQktvJr16FCoDT7a442zAG9RA9cA9hs"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL ou Anon Key não configurados. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

