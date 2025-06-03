import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: {
      exclude: ["error", "warn"], // Mantener console.error y console.warn en producción
    },
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorar errores de ESLint durante la compilación
  },
  images: {
    domains: ["localhost"], // Permitir imágenes desde localhost
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // HTTP 307 (temporal) en lugar de 308 (permanente)
      }
    ]
  }
};

export default nextConfig;