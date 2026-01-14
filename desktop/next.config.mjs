/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: "standalone",
  // Garantir que os caminhos funcionem no Electron
  basePath: "",
  assetPrefix: "",
  // Configuração do Turbopack (Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Excluir módulos Node.js do bundle do cliente
      "better-sqlite3": false,
    },
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  // Configuração do Webpack (fallback para builds)
  webpack: (config, { isServer }) => {
    // Excluir módulos Node.js do bundle do cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Excluir better-sqlite3 do bundle do cliente
      config.externals = config.externals || []
      config.externals.push({
        "better-sqlite3": "commonjs better-sqlite3",
      })
    }
    
    return config
  },
}

export default nextConfig
