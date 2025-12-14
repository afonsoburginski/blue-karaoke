/**
 * Configuração centralizada da aplicação
 */
import { env } from "./env"

export const config = {
  app: {
    name: "Blue Karaoke",
    version: "1.0.0",
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    url: env.CORS_ORIGIN,
    apiUrl: env.API_BASE_URL,
  },
  
  database: {
    url: env.DATABASE_URL,
  },
  
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: "7d",
    cookieName: "auth-token",
  },
  
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
    allowedMimeTypes: [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/mkv",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ],
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
} as const

export default config

