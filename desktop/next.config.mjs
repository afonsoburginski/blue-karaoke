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
}

export default nextConfig
