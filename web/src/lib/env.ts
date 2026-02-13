/**
 * Validação e exportação de variáveis de ambiente
 */

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  
  if (!value) {
    throw new Error(`Variável de ambiente ${key} não está definida`)
  }
  
  return value
}

export const env = {
  // Database
  DATABASE_URL: getEnv("DATABASE_URL"),
  // Supabase: DIRECT_URL para migrations (opcional)
  DIRECT_URL: process.env.DIRECT_URL,
  
  // App
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: parseInt(getEnv("PORT", "3000")),
  HOST: getEnv("HOST", "localhost"),
  
  // JWT
  JWT_SECRET: getEnv("JWT_SECRET"),
  
  // File Upload
  MAX_FILE_SIZE: parseInt(getEnv("MAX_FILE_SIZE", "104857600")), // 100MB default
  UPLOAD_DIR: getEnv("UPLOAD_DIR", "./uploads"),
  
  // CORS
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:3000"),
  
  // Session
  SESSION_SECRET: getEnv("SESSION_SECRET", process.env.JWT_SECRET || ""),
  
  // API
  API_BASE_URL: getEnv("API_BASE_URL", "http://localhost:3000/api"),

  // Mercado Pago (usa .env.local em dev, .env em produção)
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
  MERCADOPAGO_CLIENT_ID: getEnv("MERCADOPAGO_CLIENT_ID", "5541138192357609"),
  MERCADOPAGO_CLIENT_SECRET: getEnv("MERCADOPAGO_CLIENT_SECRET", "KOgP19NHodGBLq4BgHrQF6gucgEVKCd7"),
  MERCADOPAGO_WEBHOOK_SECRET: getEnv("MERCADOPAGO_WEBHOOK_SECRET", "37168bd6010c5aa5b18040fc75c35ddb952db75bc4088b4745a0a908d6eefafd"),
  
  // Supabase (Realtime + Storage)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  
  // Helpers
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const

// Validar variáveis críticas na inicialização
if (env.isProduction) {
  if (env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres em produção")
  }
}

