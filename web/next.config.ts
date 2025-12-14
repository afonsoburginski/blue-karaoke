import type { NextConfig } from "next";
import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  // Configurações de ambiente
  env: {
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    PORT: env.PORT.toString(),
    HOST: env.HOST,
    MAX_FILE_SIZE: env.MAX_FILE_SIZE.toString(),
    UPLOAD_DIR: env.UPLOAD_DIR,
    CORS_ORIGIN: env.CORS_ORIGIN,
    SESSION_SECRET: env.SESSION_SECRET,
    API_BASE_URL: env.API_BASE_URL,
  },
};

export default nextConfig;
