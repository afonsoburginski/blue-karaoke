import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import path from "path"

// Carregar variáveis de ambiente do env.txt
dotenv.config({ path: path.join(process.cwd(), "env.txt") })

// Obter URL e anon key do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tutatgjpyzhfviabepln.supabase.co"
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  "sb_publishable_N6erfoQx0hFL-kGLX_DrJA_Ww5R_ml6"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL ou Anon Key não configurados. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no env.txt"
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Desktop não precisa persistir sessão
    autoRefreshToken: false,
  },
})
