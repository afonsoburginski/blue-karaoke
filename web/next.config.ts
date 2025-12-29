import type { NextConfig } from "next";
import { env } from "./src/lib/env";

const nextConfig: NextConfig = {
  // Ignorar erros de TypeScript durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
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
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
  },
};

export default nextConfig;
