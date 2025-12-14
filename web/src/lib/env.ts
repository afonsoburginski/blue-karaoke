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

  // Cloudflare R2 (S3 compatible)
  R2_ACCOUNT_ID: getEnv("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: getEnv("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: getEnv("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET: getEnv("R2_BUCKET"),
  R2_PUBLIC_URL: getEnv("R2_PUBLIC_URL"),
  R2_ENDPOINT: getEnv(
    "R2_ENDPOINT",
    process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : ""
  ),
  
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

